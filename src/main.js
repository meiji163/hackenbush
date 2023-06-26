// import { level1 } from "./levels.js"
import { bfs, chopEdge } from "./graph.js"

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

const floor = 5 * height / 6;
const rootPosX = (2 * width) / 3;

const graph1 = {
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
    {"id": 8, "source": 9, "target": 5},
    {"id": 9, "source": 2, "target": 1},
    {"id": 10, "source": 1, "target": 9},
    {"id": 11, "source": 3, "target": 3},
    //{"source": 5, "target": 5}
  ]
}


function runGame(G){
  const rootIds = G.nodes.filter((e) => e.isRoot)
                   .map((e) => e.id);
  G.roots = rootIds;
  let turn = 0;
  let stateDiffs = [];

  let nextState = (diff) => {
    turn += 1;
    stateDiffs.push(diff);
    G.links = G.links.filter((e) => !diff.linkIds.includes(e.id));
    G.nodes= G.nodes.filter((n) => !diff.linkIds.includes(n.id));
  }
  runForceSim(G, nextState);
}

// runForceSim sets up d3 force-graph given graph
function runForceSim(G, updateFunc){
  let link = svg.append("g")
              .attr("class", "links")
              .selectAll("path")
              .data(G.links)
              .enter().append("path")
              .on("mouseover", edgeMouseOverFunc(G))
              .on("mouseout", edgeMouseOut)
              .on("click", edgeClickFunc(G, updateFunc))

  let nodes = svg.append("g")
              .attr("class", "nodes")
              .selectAll("circle")
              .data(G.nodes)
              .enter().append("circle")
              .attr("r", 10)

  const simulation = d3.forceSimulation(G.nodes)
                    .force("link",
                            d3.forceLink(G.links)
                              .strength(0.3)
                              .distance(function (d) {
                                return d.hasOwnProperty("length") ? d.length : 80
                              })
                              .id(function(d) { return d.id; }))
                    .force("charge", d3.forceManyBody()
                                        .distanceMax(100))
                    .force("collide", d3.forceCollide(30))
                    .on("tick", ticked);

  let unrootedNodes = nodes.filter(function(d) { return !d.isRoot });
  unrootedNodes.call(d3.drag()
                      .on("start", dragStartFunc(simulation))
                      .on("drag", dragNode)
                      .on("end", dragEndFunc(simulation)));

  function ticked() {
    link.attr("d", linkPos);
    nodes
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
  }
}

// -----------------------------------------------------------------------------



// -----------------------------------------------------------------------------
// Event listeners

function edgeMouseOverFunc(graph){
  return (event, d) => {
  let remove = chopEdge(graph,d);
  d3.selectAll(".links path")
    .filter((e) => remove.linkIds.includes(e.id))
    .style("stroke","red");
  };
}

function edgeMouseOut(event, d) {
  d3.selectAll(".links path")
    .style("stroke", "#aaa");
}

function notP(f) {
  return (x) => !f(x);
}

function edgeClickFunc(graph, callback) {
  return (event, d) => {
    let remove = chopEdge(graph, d);
    let rmEdgeP = (e) => remove.linkIds.includes(e.id);
    let rmNodeP = (n) => remove.nodeIds.includes(n.id);

    d3.selectAll(".links path")
      .filter(rmEdgeP)
      .remove();
    d3.selectAll(".nodes circle")
      .filter(rmNodeP)
      .remove();
    callback(remove);
  };
}

function linkPos(d) {
  //Self edge.
  let x1 = d.source.x;
  let x2 = d.target.x;
  let y1 = d.source.y;
  let y2 = d.target.y;

  if (d.source.id == d.target.id) {
      let xRotation = 90;
      let largeArc = 1;
      let sweep = 1;
      let drx = 30;
      let dry = 25;

      // For whatever reason the arc collapses to a point if the beginning
      // and ending points of the arc are the same, so kludge it.
      x2 = x2 + 1;
      y2 = y2 + 1;

      return `M${x1},${y1}` +
      `A${drx},${dry} ${xRotation},${largeArc},${sweep} ${x2},${y2}`;
  }

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

function dragStartFunc(simulation){
  return (event, d) => {
    console.log(d.id);
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };
}

function dragNode(event, d) {
  if (event.x > 0 && event.x < width) {
    d.fx = event.x;
  }
  if (event.y > 0 && event.y < floor) {
    d.fy = event.y;
  }
}

function dragEndFunc(simulation) {
  return (event, d) => {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  };
}


// ------------------------------------------------------
runGame(graph1);
