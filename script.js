document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('mindmap-container');
    let nodeIdCounter = 0;

    // Fonction pour créer un nouveau nœud
    function createNode(text, parentId = null) {
        const node = document.createElement('div');
        const nodeId = `node-${nodeIdCounter++}`;
        
        node.id = nodeId;
        node.className = 'node';
        node.dataset.parentId = parentId;
        node.dataset.children = ''; // Stocke les IDs des enfants
        node.textContent = text;
        
        // Bouton pour ajouter un enfant
        const addButton = document.createElement('button');
        addButton.className = 'add-button';
        addButton.textContent = '+';
        addButton.onclick = (e) => {
            e.stopPropagation();
            addNodeToParent(node);
        };
        node.appendChild(addButton);

        // Bouton pour supprimer le nœud
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'x';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteNode(node);
        };
        node.appendChild(deleteButton);

        // Double-clic pour éditer le texte
        node.ondblclick = () => {
            editNode(node);
        };

        container.appendChild(node);
        return node;
    }

    // Fonction pour ajouter un nœud à un parent
    function addNodeToParent(parentNode) {
        const newText = prompt("Entrez le texte du nouveau nœud :");
        if (newText) {
            const newNode = createNode(newText, parentNode.id);
            const children = parentNode.dataset.children ? parentNode.dataset.children.split(',') : [];
            children.push(newNode.id);
            parentNode.dataset.children = children.join(',');
            positionNodes();
        }
    }

    // Fonction pour supprimer un nœud et ses enfants
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
        }
    }

    // Fonction pour éditer le texte d'un nœud
    function editNode(node) {
        const currentText = node.textContent.replace('+', '').replace('x', '').trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-node';
        input.value = currentText;

        // Remplacer le contenu du nœud par l'input
        node.innerHTML = '';
        node.appendChild(input);
        input.focus();

        const saveChanges = () => {
            node.textContent = input.value.trim() || 'Nouveau nœud';
            // Remettre les boutons d'action
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
        };

        input.onblur = saveChanges;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                saveChanges();
                positionNodes();
            }
        };
    }

    // Fonction pour positionner les nœuds de manière hiérarchique
    function positionNodes() {
        const root = document.querySelector('.node.root');
        if (!root) return;

        // Positionner le nœud racine au centre
        root.style.left = `${container.offsetWidth / 2 - root.offsetWidth / 2}px`;
        root.style.top = '50px';

        // Créer ou vider l'élément SVG pour les lignes
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
            let totalWidth = 0;
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

            let xPosition = 50;
            childrenPerLevel.forEach(item => {
                const { parent, children } = item;
                const parentX = parseFloat(parent.style.left);
                const childrenWidth = children.reduce((sum, child) => sum + child.offsetWidth + 50, 0); // 50px de marge

                let startX = parentX - (childrenWidth / 2);
                
                children.forEach(child => {
                    child.style.top = `${yOffset}px`;
                    child.style.left = `${startX}px`;
                    
                    // Dessiner la ligne
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

    // Créer le nœud racine au chargement de la page
    const rootNode = createNode('Idée principale');
    rootNode.classList.add('root');
    positionNodes();
});