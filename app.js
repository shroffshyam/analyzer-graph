(function(){

    let dataJson = {};  
    let s;
    
    //document.querySelector('#choose-file').addEventListener('click', chooseFile);
    const chooseFileButton = document.querySelector('#choose-file');
    const fileNameLabel = document.querySelector('.filename');
    var chosenFileEntry = null;
    
    function errorHandler(e) {
        console.error(e);
    }
    
    function loadInitialFile(launchData) {
        if (launchData && launchData.items && launchData.items[0]) {
          loadFileEntry(launchData.items[0].entry);
        } else {
          chrome.storage.local.get('chosenFile', function(items) {
            if (items.chosenFile) {
              chrome.fileSystem.restoreEntry(items.chosenFile, function(chosenEntry) {
                if (chosenEntry) {
                  loadFileEntry(chosenEntry);
                }
              });
            }
          });
        }
      }
    
    function chooseFile () {
      var accepts = [{
        mimeTypes: ['text/*'],
        extensions: ['json']
      }];
      chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(readOnlyEntry) {
        if (!readOnlyEntry) {
          displayText('No file selected.');
          return;
        }
        try { // TODO remove try once retain is in stable.
        chrome.storage.local.set(
            {'chosenFile': chrome.fileSystem.retainEntry(readOnlyEntry)});
        } catch (e) {
            errorHandler(e);
        }
        loadFileEntry(readOnlyEntry);
      });
    }
    
    function loadFileEntry(_chosenFileEntry) {
        chosenFileEntry = _chosenFileEntry;
        chosenFileEntry.file(function(file) {
            //disable export button 
            loadFromFile(file);
            displayfileEntryPath(chosenFileEntry);
        });
    }

    function displayfileEntryPath(file){
        fileNameLabel.innerHTML = file.name;
    }
    
    function loadFromFile(file){
        clearState();
        var reader = new FileReader();
        reader.onload = onReaderLoad;
        reader.onerror = onReaderLoad;
        reader.readAsText(file);
    }
    
    function onReaderLoad(event){
        if(event.target.result){
            dataJson = JSON.parse(event.target.result);
            loadGraph(dataJson);
        }else{
            errorHandler(event);
        }
    }
    
    function clearState() {
        document.querySelector('#graph-container').innerHTML = '';
        fileNameLabel.innerHTML = "";
    }
    
    sigma.classes.graph.addMethod('neighbors', function(nodeId) {
        var k,
            neighbors = {},
            index = this.allNeighborsIndex[nodeId] || {};
      
        for (k in index)
          neighbors[k] = this.nodesIndex[k];
      
        return neighbors;
      });
    
    
    function loadGraph(data){
    
      const copy = Object.assign({}, data.result.graph);
      const dataNodes = copy.vertices;
      const dataEdges = copy.edges;
      const nodeCount = dataNodes.length;
      
      
      dataNodes.forEach((item, idx) => {
        item.x = (Math.cos(idx / nodeCount * Math.PI * 2) * nodeCount);
        item.y = (Math.sin(idx / nodeCount * Math.PI * 2) * nodeCount);
        item.size = Math.floor(Math.random() * 5) + 5;
        item.color = '#'+Math.floor(Math.random()*16777215).toString(16);
        item.label = item.properties.name[0].value;
        
        return item;
      });
      
      dataEdges.forEach((item) => {
        item.source = item.inV;
        item.target = item.outV;
        item.arrow = 'target';
        item.type  = 'arrow';
        return item;
      });
      
      
      // Instantiate sigma:
    s = new sigma({
        graph: {
            nodes: dataNodes,
            edges: dataEdges
        },
        container: 'graph-container',
        settings: {
              minEdgeSize: 0.5,
              maxEdgeSize: 4,
        }
      });
      
      
      
      // We first need to save the original colors of our
      // nodes and edges, like this:
      s.graph.nodes().forEach(function(n) {
        n.originalColor = n.color;
      });
      s.graph.edges().forEach(function(e) {
        e.originalColor = e.color;
      });
      
      // When a node is clicked, we check for each node
      // if it is a neighbor of the clicked one. If not,
      // we set its color as grey, and else, it takes its
      // original color.
      // We do the same for the edges, and we only keep
      // edges that have both extremities colored.
      s.bind('clickNode', function(e) {
        var nodeId = e.data.node.id,
            toKeep = s.graph.neighbors(nodeId);
        toKeep[nodeId] = e.data.node;
      
        s.graph.nodes().forEach(function(n) {
          if (toKeep[n.id])
            n.color = n.originalColor;
          else
            n.color = '#eee';
        });
      
        s.graph.edges().forEach(function(e) {
          if (toKeep[e.source] && toKeep[e.target])
            e.color = e.originalColor;
          else
            e.color = '#eee';
        });
      
        // Since the data has been modified, we need to
        // call the refresh method to make the colors
        // update effective.
        s.refresh();
      });
      
      // When the stage is clicked, we just color each
      // node and edge with its original color.
      s.bind('clickStage', function(e) {
        s.graph.nodes().forEach(function(n) {
          n.color = n.originalColor;
        });
      
        s.graph.edges().forEach(function(e) {
          e.color = e.originalColor;
        });
      
        // Same as in the previous event:
        s.refresh();
      });
    
    }
    
    window.addEventListener('resize', function(){
        s.refresh();
    })
    
    chooseFileButton.addEventListener('click', chooseFile);
    loadInitialFile(launchData);

})();

