document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('mindmap-container');
    const saveButton = document.getElementById('save-button');
    const newMapButton = document.getElementById('new-map-button');
    let nodeIdCounter = 0;

    let draggedNode = null;
    let offsetX = 0;
    let offsetY = 0;

    // --- Fonctions de sauvegarde et de chargement ---

    function saveMindMap() {
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

        localStorage.setItem('mindMapData', JSON.stringify(mindMapData));
        console.log('Carte mentale sauvegardée.');
    }

    function loadMindMap() {
        const mindMapData = JSON.parse(localStorage.getItem('mindMapData'));

        if (!mindMapData || Object.keys(mindMapData).length === 0) {
            createInitialNode();
            return;
        }

        container.innerHTML = '';
        
        Object.values(mindMapData).forEach(data => {
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
        console.log('Carte mentale chargée.');
    }

    function createInitialNode() {
        container.innerHTML = '';
        const rootNode = createNode('Idée principale');
        rootNode.classList.add('root');
        
        // Positionne le nœud racine au centre au démarrage
        rootNode.style.left = `${container.offsetWidth / 2 - rootNode.offsetWidth / 2}px`;
        rootNode.style.top = `${container.offsetHeight / 2 - rootNode.offsetHeight / 2}px`;
        
        drawLines();
        saveMindMap();
    }

    // --- Fonctions de glisser-déposer ---

    function startDrag(e) {
        if (e.target.tagName === 'BUTTON') return;
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

        // Empêche le nœud de sortir des bords du conteneur
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
            saveMindMap();
        }
    }

    // --- Fonction pour dessiner les lignes (remplace positionNodes) ---

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

    // --- Fonctions de gestion des nœuds (mises à jour) ---

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

        // Ajoute l'écouteur d'événement pour le glisser-déposer
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

            // Positionne le nouveau nœud juste en dessous de son parent
            const parentRect = parentNode.getBoundingClientRect();
            newNode.style.left = `${parentRect.left - container.getBoundingClientRect().left}px`;
            newNode.style.top = `${parentRect.top - container.getBoundingClientRect().top + parentRect.height + 50}px`;

            drawLines();
            saveMindMap();
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
            if (parentId) {
                const parentNode = document.getElementById(parentId);
                if (parentNode) {
                    let parentChildren = parentNode.dataset.children.split(',').filter(id => id !== node.id);
                    parentNode.dataset.children = parentChildren.join(',');
                }
            }
            node.remove();
            drawLines();
            saveMindMap();
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

            drawLines();
            saveMindMap();
        };

        input.onblur = saveChanges;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                saveChanges();
            }
        };
    }

    // --- Écouteurs d'événements pour les boutons ---
    saveButton.addEventListener('click', saveMindMap);
    newMapButton.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir commencer une nouvelle carte ? Toute progression non sauvegardée sera perdue.")) {
            localStorage.removeItem('mindMapData');
            createInitialNode();
        }
    });

    // --- Lancement de l'application ---
    loadMindMap();
});