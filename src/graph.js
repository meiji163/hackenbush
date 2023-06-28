export { bfs, chopEdge };

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
// disconnected by removing the given edge from the graph.
function chopEdge(G, edge) {
  let chopG = Object.assign({}, G);
  chopG.links = G.links.filter((e) => e.id != edge.id)

  let sourceBFS = bfs(chopG, edge.source.id);
  let foundRoot = G.roots.some((r) => sourceBFS.nodeIds.includes(r));
  if (!foundRoot) {
    // the other terminal of the edge must be connected to a root
    sourceBFS.linkIds.push(edge.id)
    return sourceBFS;
  }
  // check if other side is connected to a root
  let targetBFS = bfs(chopG, edge.target.id);
  foundRoot = G.roots.some((r) => targetBFS.nodeIds.includes(r));
  if (!foundRoot) {
    targetBFS.linkIds.push(edge.id)
    return targetBFS;
  }
  return {"linkIds": [edge.id], "nodeIds": []};
}
