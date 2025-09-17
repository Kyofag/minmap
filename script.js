document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('mindmap-container');
    const saveButton = document.getElementById('save-button');
    const newMapButton = document.getElementById('new-map-button');
    let nodeIdCounter = 0;

    // --- Fonctions de sauvegarde et de chargement ---

    function saveMindMap() {
        const nodes = document.querySelectorAll('.node');
        const mindMapData = {};

        nodes.forEach(node => {
            mindMapData[node.id] = {
                id: node.id,
                text: node.textContent.replace('+', '').replace('x', '').replace('✏️', '').trim(),
                parentId: node.dataset.parentId,
                children: node.dataset.children
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

        container.innerHTML = ''; // Vide le conteneur pour charger la nouvelle carte
        
        // Créer les nœuds à partir des données sauvegardées
        Object.values(mindMapData).forEach(data => {
            const node = createNode(data.text, data.parentId);
            node.id = data.id;
            node.dataset.children = data.children;
            if (data.parentId === 'null') {
                node.classList.add('root');
            }
        });

        positionNodes();
        console.log('Carte mentale chargée.');
    }

    function createInitialNode() {
        container.innerHTML = '';
        const rootNode = createNode('Idée principale');
        rootNode.classList.add('root');
        positionNodes();
        saveMindMap();
    }

    // --- Fonctions existantes (modifiées pour l'autosave) ---

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
            positionNodes();
            saveMindMap(); // Sauvegarde automatique
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
            positionNodes();
            saveMindMap(); // Sauvegarde automatique
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
            container.appendChild(newNode);

            positionNodes();
            saveMindMap(); // Sauvegarde automatique
        };

        input.onblur = saveChanges;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                saveChanges();
            }
        };
    }

    function positionNodes() {
        const root = document.querySelector('.node.root');
        if (!root) return;

        root.style.left = `${container.offsetWidth / 2 - root.offsetWidth / 2}px`;
        root.style.top = '50px';

        let svg = document.getElementById('mindmap-lines');
        if (svg) {
            svg.innerHTML = '';
        } else {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'mindmap-lines';
            container.appendChild(svg);
        }

        const nodesToProcess = [root];
        const processedNodes = new Set();
        let currentLevel = [root];
        let nextLevel = [];
        let yOffset = 150;

        while (currentLevel.length > 0) {
            const childrenPerLevel = [];
            currentLevel.forEach(parentNode => {
                const childrenIds = parentNode.dataset.children.split(',').filter(id => id);
                const childrenNodes = childrenIds.map(id => document.getElementById(id)).filter(node => node && !processedNodes.has(node));
                
                if (childrenNodes.length > 0) {
                    childrenPerLevel.push({ parent: parentNode, children: childrenNodes });
                    nextLevel.push(...childrenNodes);
                }
            });

            if (nextLevel.length === 0) break;

            childrenPerLevel.forEach(item => {
                const { parent, children } = item;
                const parentX = parseFloat(parent.style.left);
                const childrenWidth = children.reduce((sum, child) => sum + child.offsetWidth + 50, 0); 
                let startX = parentX - (childrenWidth / 2);
                
                children.forEach(child => {
                    child.style.top = `${yOffset}px`;
                    child.style.left = `${startX}px`;
                    
                    const parentRect = parent.getBoundingClientRect();
                    const childRect = child.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    
                    const pX = parentRect.left + parentRect.width / 2 - containerRect.left;
                    const pY = parentRect.top + parentRect.height / 2 - containerRect.top;
                    const cX = childRect.left + childRect.width / 2 - containerRect.left;
                    const cY = childRect.top + childRect.height / 2 - containerRect.top;
                    
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', pX);
                    line.setAttribute('y1', pY);
                    line.setAttribute('x2', cX);
                    line.setAttribute('y2', cY);
                    line.setAttribute('class', 'line');
                    svg.appendChild(line);

                    startX += child.offsetWidth + 50;
                    processedNodes.add(child);
                });
            });

            currentLevel = nextLevel;
            nextLevel = [];
            yOffset += 150;
        }
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