document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('mindmap-container');
    const mindmapSelector = document.getElementById('mindmap-selector');
    const loadButton = document.getElementById('load-button');
    const deleteButton = document.getElementById('delete-button');
    const newMapButton = document.getElementById('new-map-button');
    const addRootButton = document.getElementById('add-root-button');

    let currentMapName = 'Ma première carte';
    let nodeIdCounter = 0;

    let draggedNode = null;
    let offsetX = 0;
    let offsetY = 0;

    // --- Fonctions de gestion des cartes mentales ---

    function saveCurrentMap() {
        const nodes = document.querySelectorAll('.node');
        const mindMapData = {};

        nodes.forEach(node => {
            mindMapData[node.id] = {
                id: node.id,
                text: node.textContent.replace('+', '').replace('x', '').replace('✏️', '').trim(),
                parentId: node.dataset.parentId,
                children: node.dataset.children,
                x: node.style.left,
                y: node.style.top
            };
        });

        const allMaps = JSON.parse(localStorage.getItem('allMindMaps')) || {};
        allMaps[currentMapName] = mindMapData;
        localStorage.setItem('allMindMaps', JSON.stringify(allMaps));
        console.log(`Carte "${currentMapName}" sauvegardée.`);
    }

    function loadMap(mapName) {
        const allMaps = JSON.parse(localStorage.getItem('allMindMaps')) || {};
        const mapData = allMaps[mapName];

        container.innerHTML = '';
        currentMapName = mapName;
        document.title = `Mind Map - ${currentMapName}`;
        
        if (!mapData || Object.keys(mapData).length === 0) {
            console.log(`Nouvelle carte "${mapName}" créée.`);
            addRootNode();
            return;
        }

        Object.values(mapData).forEach(data => {
            const node = createNode(data.text, data.parentId);
            node.id = data.id;
            node.dataset.children = data.children;
            node.style.left = data.x;
            node.style.top = data.y;
            if (data.parentId === 'null') {
                node.classList.add('root');
            }
        });

        drawLines();
        console.log(`Carte "${currentMapName}" chargée.`);
    }

    function listAllMaps() {
        const allMaps = JSON.parse(localStorage.getItem('allMindMaps')) || {};
        const mapNames = Object.keys(allMaps);

        mindmapSelector.innerHTML = '';
        if (mapNames.length === 0) {
            mindmapSelector.innerHTML = '<option>Aucune carte</option>';
            return;
        }

        mapNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            mindmapSelector.appendChild(option);
        });

        mindmapSelector.value = currentMapName;
    }

    // --- Fonctions de glisser-déposer ---

    function startDrag(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        draggedNode = e.currentTarget;
        draggedNode.classList.add('dragging');
        
        const rect = draggedNode.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
    }

    function drag(e) {
        if (!draggedNode) return;
        
        const containerRect = container.getBoundingClientRect();
        
        let newX = e.clientX - containerRect.left - offsetX;
        let newY = e.clientY - containerRect.top - offsetY;

        newX = Math.max(0, Math.min(newX, containerRect.width - draggedNode.offsetWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - draggedNode.offsetHeight));

        draggedNode.style.left = `${newX}px`;
        draggedNode.style.top = `${newY}px`;
        
        drawLines();
    }

    function endDrag() {
        if (draggedNode) {
            draggedNode.classList.remove('dragging');
            draggedNode = null;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', endDrag);
            saveCurrentMap();
        }
    }

    // --- Fonction pour dessiner les lignes ---

    function drawLines() {
        let svg = document.getElementById('mindmap-lines');
        if (svg) {
            svg.innerHTML = '';
        } else {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'mindmap-lines';
            container.appendChild(svg);
        }

        const nodes = document.querySelectorAll('.node');
        const containerRect = container.getBoundingClientRect();

        nodes.forEach(node => {
            const parentId = node.dataset.parentId;
            if (parentId !== 'null') {
                const parentNode = document.getElementById(parentId);
                if (parentNode) {
                    const parentRect = parentNode.getBoundingClientRect();
                    const nodeRect = node.getBoundingClientRect();

                    const pX = parentRect.left + parentRect.width / 2 - containerRect.left;
                    const pY = parentRect.top + parentRect.height / 2 - containerRect.top;
                    const cX = nodeRect.left + nodeRect.width / 2 - containerRect.left;
                    const cY = nodeRect.top + nodeRect.height / 2 - containerRect.top;
                    
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', pX);
                    line.setAttribute('y1', pY);
                    line.setAttribute('x2', cX);
                    line.setAttribute('y2', cY);
                    line.setAttribute('class', 'line');
                    svg.appendChild(line);
                }
            }
        });
    }

    // --- Fonctions de gestion des nœuds ---

    function createNode(text, parentId = null) {
        const node = document.createElement('div');
        const nodeId = `node-${nodeIdCounter++}`;
        
        node.id = nodeId;
        node.className = 'node';
        node.dataset.parentId = parentId;
        node.dataset.children = ''; 
        node.textContent = text;
        
        const addButton = document.createElement('button');
        addButton.className = 'add-button';
        addButton.textContent = '+';
        addButton.onclick = (e) => {
            e.stopPropagation();
            addNodeToParent(node);
        };
        node.appendChild(addButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'x';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteNode(node);
        };
        node.appendChild(deleteButton);

        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.textContent = '✏️';
        editButton.onclick = (e) => {
            e.stopPropagation();
            editNode(node);
        };
        node.appendChild(editButton);

        node.addEventListener('mousedown', startDrag);
        container.appendChild(node);
        return node;
    }

    function addNodeToParent(parentNode) {
        const newText = prompt("Entrez le texte du nouveau nœud :");
        if (newText) {
            const newNode = createNode(newText, parentNode.id);
            const children = parentNode.dataset.children ? parentNode.dataset.children.split(',') : [];
            children.push(newNode.id);
            parentNode.dataset.children = children.join(',');

            const parentRect = parentNode.getBoundingClientRect();
            newNode.style.left = `${parentRect.left - container.getBoundingClientRect().left}px`;
            newNode.style.top = `${parentRect.top - container.getBoundingClientRect().top + parentRect.height + 50}px`;

            drawLines();
            saveCurrentMap();
        }
    }

    function addRootNode() {
        const newText = prompt("Nom de la nouvelle idée principale :");
        if (newText) {
            const newNode = createNode(newText, 'null');
            newNode.classList.add('root');
            // Positionne la nouvelle idée principale aléatoirement pour éviter la superposition
            const randomX = Math.random() * (container.offsetWidth - newNode.offsetWidth);
            const randomY = Math.random() * (container.offsetHeight - newNode.offsetHeight);
            newNode.style.left = `${randomX}px`;
            newNode.style.top = `${randomY}px`;
            drawLines();
            saveCurrentMap();
        }
    }

    function deleteNode(node) {
        const confirmation = confirm("Êtes-vous sûr de vouloir supprimer ce nœud et tous ses enfants ?");
        if (confirmation) {
            const children = node.dataset.children.split(',').filter(id => id);
            children.forEach(childId => {
                const childNode = document.getElementById(childId);
                if (childNode) {
                    deleteNode(childNode);
                }
            });
            
            const parentId = node.dataset.parentId;
            if (parentId !== 'null') {
                const parentNode = document.getElementById(parentId);
                if (parentNode) {
                    let parentChildren = parentNode.dataset.children.split(',').filter(id => id !== node.id);
                    parentNode.dataset.children = parentChildren.join(',');
                }
            }
            node.remove();
            drawLines();
            saveCurrentMap();
        }
    }

    function editNode(node) {
        const buttons = node.querySelectorAll('button');
        buttons.forEach(btn => btn.remove());
        
        const currentText = node.textContent.trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-node';
        input.value = currentText;

        node.textContent = '';
        node.appendChild(input);
        input.focus();

        const saveChanges = () => {
            const newText = input.value.trim() || 'Nouveau nœud';
            
            node.remove();
            const newNode = createNode(newText, node.dataset.parentId);
            newNode.id = node.id;
            newNode.dataset.children = node.dataset.children;
            newNode.style.left = node.style.left;
            newNode.style.top = node.style.top;
            container.appendChild(newNode);
            
            if (node.classList.contains('root')) {
                newNode.classList.add('root');
            }

            drawLines();
            saveCurrentMap();
        };

        input.onblur = saveChanges;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                saveChanges();
            }
        };
    }

    // --- Écouteurs d'événements pour les boutons ---
    loadButton.addEventListener('click', () => {
        const selectedMap = mindmapSelector.value;
        if (selectedMap) {
            loadMap(selectedMap);
        }
    });

    deleteButton.addEventListener('click', () => {
        const mapToDelete = mindmapSelector.value;
        if (mapToDelete && confirm(`Êtes-vous sûr de vouloir supprimer la carte "${mapToDelete}" ?`)) {
            const allMaps = JSON.parse(localStorage.getItem('allMindMaps')) || {};
            delete allMaps[mapToDelete];
            localStorage.setItem('allMindMaps', JSON.stringify(allMaps));
            listAllMaps();
            
            const remainingMaps = Object.keys(allMaps);
            if (remainingMaps.length > 0) {
                loadMap(remainingMaps[0]);
            } else {
                createInitialState();
            }
        }
    });

    newMapButton.addEventListener('click', () => {
        const newMapName = prompt("Entrez le nom de la nouvelle carte :");
        if (newMapName) {
            const allMaps = JSON.parse(localStorage.getItem('allMindMaps')) || {};
            if (allMaps[newMapName]) {
                alert("Une carte avec ce nom existe déjà.");
            } else {
                currentMapName = newMapName;
                container.innerHTML = '';
                addRootNode();
                listAllMaps();
            }
        }
    });

    addRootButton.addEventListener('click', addRootNode);
    
    // --- Lancement de l'application ---
    function createInitialState() {
        const allMaps = JSON.parse(localStorage.getItem('allMindMaps')) || {};
        if (Object.keys(allMaps).length === 0) {
            const newMapName = 'Ma première carte';
            currentMapName = newMapName;
            container.innerHTML = '';
            addRootNode();
        } else {
            currentMapName = Object.keys(allMaps)[0];
        }
        listAllMaps();
        loadMap(currentMapName);
    }
    createInitialState();
});