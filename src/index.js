import * as d3 from 'd3';
import "./style.css";

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

const floor = 5 * height / 6;
const rootPosX = (2 * width) / 3;
const graph = {
  "nodes": [
    {"id": 0, "fx": (width / 3), "fy": floor, "isRoot": true},
    {"id": 1},
    {"id": 2},
    {"id": 3},
    // 2nd component
    {"id": 4, "fx": rootPosX, "fy": floor, "isRoot": true},
    {"id": 5, "x": rootPosX, "y" : floor - 30},
    {"id": 6, "x": rootPosX, "y" : floor - 30},
    {"id": 7, "x": rootPosX, "y" : floor - 30},
    {"id": 8, "x": rootPosX, "y" : floor - 30},
    {"id": 9}
  ],
  "links": [
    {"id": 0, "source": 0, "target": 1},
    {"id": 1, "source": 1, "target": 2},
    {"id": 2, "source": 1, "target": 3},
    {"id": 3, "source": 4, "target": 5, "length": 200},
    {"id": 4, "source": 5, "target": 6},
    {"id": 5, "source": 5, "target": 7},
    {"id": 6, "source": 5, "target": 8},
    {"id": 7, "source": 6, "target": 9},
    {"id": 8, "source": 5, "target": 9},
    //{"source": 5, "target": 5}
  ]
}

const rootIds = graph.nodes
                     .filter((e) => e.isRoot)
                     .map((e) => e.id);

let link = svg.append("g")
            .attr("class", "links")
            .selectAll("path")
            .data(graph.links)
            .enter().append("path")
            .on("mouseover", edgeMouseOver)
            .on("mouseout", edgeMouseOut)
            .on("click", edgeClick)

let nodes = svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(graph.nodes)
            .enter().append("circle")
            .attr("r", 10)

let unrootedNodes = nodes.filter(function(d) { return !d.isRoot });
unrootedNodes.call(d3.drag()
                     .on("start", dragStart)
                     .on("drag", dragNode)
                     .on("end", dragEnd));

const simulation = d3.forceSimulation(graph.nodes)
                   .force("link",
                          d3.forceLink(graph.links)
                            .strength(0.25)
                            .distance(function (d) {
                              return d.hasOwnProperty("length") ? d.length : 80
                            })
                            .id(function(d) { return d.id; }))
                   .force("charge", d3.forceManyBody()
                                      .distanceMax(100))
                   .on("tick", ticked);

// -----------------------------------------------------------------------------
// Graph functions

// BFS starting from source node Id
function bfs(G, sourceId){
  let st = [sourceId];
  let visNodes = [sourceId];
  let visEdges = [];

  while (st.length > 0) {
    let u = st.pop();
    let adjEdges = G.links.filter((e) => {
      if (visEdges.includes(e.id)) return false;
      return (e.target.id == u) || (e.source.id == u);
    })
    let adjNodes = adjEdges.map((e) => {
      return (e.source.id == u)? e.target.id : e.source.id;
    })

    visEdges = visEdges.concat(
      adjEdges.map((e) => e.id)
    );
    visNodes = visNodes.concat(adjNodes);
    st = st.concat(adjNodes);
  }
  return {"nodeIds": visNodes, "linkIds": visEdges}
}

// chopEdge finds Ids of edges & nodes that will be
// disconnected by removing the given edge from the graph
function chopEdge(edge) {
  let chopG = Object.assign({}, graph);
  chopG.links = graph.links.filter((e) => e.id != edge.id)

  let sourceBFS = bfs(chopG, edge.source.id);
  let foundRoot = rootIds.some((r) => sourceBFS.nodeIds.includes(r));
  if (!foundRoot) {
    // the other terminal of the edge must be connected to a root
    sourceBFS.linkIds.push(edge.id)
    return sourceBFS;
  }
  // check if other side is connected to a root
  let targetBFS = bfs(chopG, edge.target.id);
  foundRoot = rootIds.some((r) => targetBFS.nodeIds.includes(r));
  if (!foundRoot) {
    targetBFS.linkIds.push(edge.id)
    return targetBFS;
  }
  return {"linkIds": [edge.id], "nodeIds": []};
}


// -----------------------------------------------------------------------------
// Event listeners

function edgeMouseOver(event, d) {
  let remove = chopEdge(d);
  d3.selectAll(".links path")
    .filter((e) => remove.linkIds.includes(e.id))
    .style("stroke","red");
}

function edgeMouseOut(event, d) {
  d3.selectAll(".links path")
    .style("stroke", "#aaa");
}

function notP(f) {
  return (x) => !f(x);
}

function edgeClick(event, d) {
  let remove = chopEdge(d);
  let rmEdgeP = (e) => remove.linkIds.includes(e.id);
  let rmNodeP = (n) => remove.nodeIds.includes(n.id);

  d3.selectAll(".links path")
    .filter(rmEdgeP)
    .remove();
  d3.selectAll(".nodes circle")
    .filter(rmNodeP)
    .remove();
  graph.links = graph.links.filter(notP(rmEdgeP));
  graph.nodes = graph.nodes.filter(notP(rmNodeP));
}

function linkPos(d) {
  let midx = (d.source.x + d.target.x) / 2;
  let midy = (d.source.y + d.target.y) / 2;
  let dx = (d.target.x - d.source.x);
  let dy = (d.target.y - d.source.y);
  let norm = Math.sqrt(dx*dx + dy*dy);

  // offset * perpendicular
  let offset = 20;
  let offsetX = midx + offset * (dy/norm);
  let offsetY = midy - offset * (dx/norm);

  return `M${d.source.x},${d.source.y}` +
    `S${offsetX},${offsetY} ${d.target.x},${d.target.y}`;
}

function nodePos(d) {
  if (d.x < 0) d.x = 0;
  if (d.y < 0) d.y = 0;
  if (d.x > width) d.x = width;
  if (d.y > floor) d.y = floor;
  return `translate(${d.x},${d.y})`;
}

function ticked() {
  //   // Self edge.
  //   if (x1 === x2 && y1 === y2) {
  //     xRotation = -45;
  //     largeArc = 1;
  //     sweep = 0;

  //     // Make drx and dry different to get an ellipse
  //     // instead of a circle.
  //     drx = 25;
  //     dry = 30;

  //     // For whatever reason the arc collapses to a point if the beginning
  //     // and ending points of the arc are the same, so kludge it.
  //     x2 = x2 + 1;
  //     y2 = y2 + 1;
  //   }

  //   return `M${x1},${y1}` +
  //     `A${drx},${dry} ${xRotation},${largeArc},${sweep} ${x2},${y2}`
  // });

  link.attr("d", linkPos);
  nodes
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; });
}

function dragStart(event, d) {
  console.log(d.id);
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragNode(event, d) {
  if (event.x > 0 && event.x < width) {
    d.fx = event.x;
  }
  if (event.y > 0 && event.y < floor) {
    d.fy = event.y;
  }
}

function dragEnd(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}
