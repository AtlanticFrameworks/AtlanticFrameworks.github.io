/**
 * Leitstelle - State Management & UI Logic
 * Pure vanilla JavaScript with local state.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE MANAGEMENT ---
    let patrols = [];
    let currentEditingId = null;
    let draggedMarkerId = null;
    
    // Attempt to load from localStorage
    try {
        const savedPatrols = localStorage.getItem('bwrp_leitstelle_patrols');
        if (savedPatrols) {
            patrols = JSON.parse(savedPatrols);
        }
        
        const savedNotes = localStorage.getItem('bwrp_leitstelle_notes');
        const notesEl = document.getElementById('leitstelle-notes');
        if (savedNotes && notesEl) {
            notesEl.value = savedNotes;
        }
    } catch (e) {
        console.error("Could not load Leitstelle state", e);
    }
    
    // Save to localStorage
    const saveState = () => {
        localStorage.setItem('bwrp_leitstelle_patrols', JSON.stringify(patrols));
    };
    
    // Save notes automatically
    // Save notes automatically
    const notesEl = document.getElementById('leitstelle-notes');
    if (notesEl) {
        notesEl.addEventListener('input', (e) => {
            localStorage.setItem('bwrp_leitstelle_notes', e.target.value);
        });
    }

    // --- UI ELEMENTS ---
    const mapContainer = document.getElementById('map-container');
    const mapWrapper = document.getElementById('map-wrapper');
    const mapImage = document.getElementById('map-image');
    const markersLayer = document.getElementById('markers-layer');
    const patrolList = document.getElementById('patrol-list');
    
    // Map State
    let mapZoom = 0.5; // Start zoomed out
    let mapPanX = 0;
    let mapPanY = 0;
    let isPanningMap = false;
    let mapPanStartX = 0;
    let mapPanStartY = 0;
    let mapInitialPanX = 0;
    let mapInitialPanY = 0;
    
    // Modal Elements
    const modal = document.getElementById('detail-modal');
    const modalContent = document.getElementById('detail-modal-content');
    const closeBtn = document.getElementById('close-modal');
    const nameInput = document.getElementById('modal-patrol-name');
    const typeLabel = document.getElementById('modal-patrol-type');
    
    // Custom Status Dropdown Elements
    const customStatusDropdown = document.getElementById('custom-status-dropdown');
    const statusSelected = document.getElementById('status-selected');
    const statusSelectedText = document.getElementById('status-selected-text');
    const statusOptionsContainer = document.getElementById('status-options');
    let currentSelectedStatus = '';
    
    // Ultimate RP State
    let selectedPatrolId = null;
    let isSidebarCollapsed = false;
    let history = []; // For Undo
    let rpLogs = [];
    let personnelPool = [];
    let replayHistory = [];
    let isReplaying = false;
    
    const infoTextarea = document.getElementById('modal-patrol-info');
    const personnelList = document.getElementById('modal-personnel-list');
    const personnelInput = document.getElementById('modal-personnel-input');
    const addPersonBtn = document.getElementById('modal-add-person');
    const saveBtn = document.getElementById('modal-save');
    const deleteBtn = document.getElementById('modal-delete-patrol');
    const modalIcon = document.getElementById('modal-icon');
    
    // Codes Modal Elements
    const codesModal = document.getElementById('codes-modal');
    const codesModalContent = document.getElementById('codes-modal-content');
    const openCodesBtn = document.getElementById('open-codes-btn');
    const closeCodesBtn = document.getElementById('close-codes-modal');
    
    // --- RENDER FUNCTIONS ---
    
    const renderAll = () => {
        renderMarkers();
        renderSidebar();
        saveState();
        
        // Re-initialize lucide icons for newly created elements
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };
    
    const renderSidebar = () => {
        patrolList.innerHTML = '';
        
        if (patrols.length === 0) {
            patrolList.innerHTML = '<div class="text-gray-500 text-xs text-center italic py-4">Keine Streifen aktiv.</div>';
            return;
        }
        
        patrols.forEach(patrol => {
            const isVehicle = patrol.type === 'vehicle';
            const iconName = isVehicle ? 'car' : 'footprints';
            const iconColor = isVehicle ? 'text-bw-gold' : 'text-blue-400';
            const personnelCount = patrol.personnel.length;
            
            const el = document.createElement('div');
            el.className = 'bg-black/40 hover:bg-white/5 border border-white/10 rounded p-3 transition-colors flex flex-col gap-2 group';
            
            el.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded bg-black/50 flex items-center justify-center border border-white/10">
                            <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor}"></i>
                        </div>
                        <div>
                            <div class="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">${escapeHTML(patrol.name)}</div>
                            <div class="text-[10px] text-gray-500 uppercase tracking-widest truncate max-w-[120px]" title="${patrol.status}">${patrol.status}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 text-xs text-gray-400">
                        <i data-lucide="users" class="w-3 h-3"></i> ${personnelCount}
                    </div>
                </div>
                <div class="flex gap-2 mt-1">
                    <button class="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded py-1 text-xs text-gray-400 hover:text-white flex flex-col items-center gap-1 transition-colors btn-focus" data-id="${patrol.id}" title="Auf Karte fokussieren">
                        <i data-lucide="crosshair" class="w-3 h-3"></i> Focus
                    </button>
                    <button class="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded py-1 text-xs text-gray-400 hover:text-bw-gold flex flex-col items-center gap-1 transition-colors btn-edit" data-id="${patrol.id}" title="Bearbeiten">
                        <i data-lucide="edit-2" class="w-3 h-3"></i> Edit
                    </button>
                </div>
            `;
            
            patrolList.appendChild(el);
        });

        // Attach event listeners for the new buttons
        document.querySelectorAll('.btn-focus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                focusOnMap(e.currentTarget.dataset.id);
            });
        });
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                openModal(e.currentTarget.dataset.id);
            });
        });
    };
    
    const renderMarkers = () => {
        markersLayer.innerHTML = '';
        document.getElementById('radar-markers').innerHTML = '';
        
        patrols.forEach(patrol => {
            const isVehicle = patrol.type === 'vehicle';
            const iconName = isVehicle ? 'car' : 'footprints';
            const personnelCount = patrol.personnel.length;
            
            const el = document.createElement('div');
            el.className = `marker pointer-events-auto flex flex-col items-center gap-2 group ${selectedPatrolId === patrol.id ? 'selected' : ''}`;
            el.style.left = `${patrol.x}%`;
            el.style.top = `${patrol.y}%`;
            el.dataset.id = patrol.id;
            
            // Determine color based on status
            let statusColorClass = 'bg-green-500'; // Default ready
            if (patrol.status.includes('10-09') || patrol.status.includes('10-02') || patrol.status.includes('Pause')) statusColorClass = 'bg-yellow-500';
            if (patrol.status.includes('11-') || patrol.status.includes('20-') || patrol.status.includes('Code 3')) statusColorClass = 'bg-red-500';
            if (patrol.status.includes('10-80')) statusColorClass = 'bg-red-600 animate-pulse';

            el.innerHTML = `
                <div class="marker-tooltip">
                    <div class="font-bold text-bw-gold">${escapeHTML(patrol.name)}</div>
                    <div class="text-[10px] text-gray-300 uppercase">${patrol.status}</div>
                    ${patrol.personnel.length > 0 ? `<div class="text-[10px] text-blue-400 mt-1 border-t border-white/10 pt-1">${patrol.personnel.slice(0, 2).join(', ')}</div>` : ''}
                </div>
                <div class="marker-icon relative w-14 h-14 rounded-full ${statusColorClass} border-[3px] border-black/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all group-hover:scale-110">
                    <i data-lucide="${iconName}" class="w-7 h-7 text-white"></i>
                    ${personnelCount > 0 ? `<div class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black/50 shadow-lg">${personnelCount}</div>` : ''}
                </div>
                <div class="bg-black/90 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase text-white shadow-xl whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
                    ${escapeHTML(patrol.name)}
                </div>
            `;
            
            // Drag and drop event listeners
            el.addEventListener('mousedown', handleDragStart);
            
            // Interaction listeners
            el.addEventListener('click', (e) => {
                if (hasDraggedMarker) return;
                
                // Shift + Click: Cycle Status
                if (e.shiftKey) {
                    cycleStatus(patrol);
                    return;
                }

                selectPatrol(patrol.id);
            });

            el.addEventListener('dblclick', () => {
                openModal(patrol.id);
            });
            
            setupMarkerDropTarget(el, patrol.id);
            
            markersLayer.appendChild(el);
            
            // Render Radar Marker
            renderRadarMarker(patrol, statusColorClass);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const renderRadarMarker = (patrol, colorClass) => {
        const radarMarkers = document.getElementById('radar-markers');
        const rMarker = document.createElement('div');
        rMarker.className = `absolute w-2 h-2 rounded-full ${colorClass} border border-black/50`;
        rMarker.style.left = `${patrol.x}%`;
        rMarker.style.top = `${patrol.y}%`;
        radarMarkers.appendChild(rMarker);
    };

    const selectPatrol = (id) => {
        selectedPatrolId = id;
        renderAll();
    };

    const cycleStatus = (patrol) => {
        const statuses = [
            '10-04 | Verstanden / Einsatzbereit',
            '10-09 | Pause',
            '11-99 | Unter Beschuss'
        ];
        let currentIndex = statuses.indexOf(patrol.status);
        if (currentIndex === -1) currentIndex = 0;
        patrol.status = statuses[(currentIndex + 1) % statuses.length];
        
        addLog(`Status von ${patrol.name} geändert: ${patrol.status}`, 'INFO');
        saveState();
        renderAll();
    };
    
    // --- MAP PAN & ZOOM LOGIC ---

    const getMinZoom = () => {
        const containerRect = mapContainer.getBoundingClientRect();
        const baseW = 2500; // Unscaled image width
        const baseH = mapWrapper.offsetHeight || 2500;
        
        // Calculate the scale needed to fit the image into the container completely
        // Math.min makes it fit entirely (contain). Math.max makes it cover.
        // We want to limit zoom out so it doesn't get smaller than the container
        const scaleX = containerRect.width / baseW;
        const scaleY = containerRect.height / baseH;
        return Math.max(0.1, Math.max(scaleX, scaleY));
    };
    
    const updateMapTransform = () => {
        // Enforce min zoom so image is never too small
        const minZ = getMinZoom();
        if (mapZoom < minZ) mapZoom = minZ;

        // Since wrapper is top:50%, left:50%, we center it with -50%, -50% and then add the pan offset
        mapWrapper.style.transform = `translate(calc(-50% + ${mapPanX}px), calc(-50% + ${mapPanY}px)) scale(${mapZoom})`;
        
        updateRadarViewport();
    };

    const updateRadarViewport = () => {
        const radarViewport = document.getElementById('radar-viewport');
        const containerRect = mapContainer.getBoundingClientRect();
        
        // The radar viewport box shows what is currently visible
        // We need to calculate how much the map overflows the container
        const zoom = mapZoom;
        const w = (containerRect.width / (2500 * zoom)) * 100;
        const h = (containerRect.height / ((mapWrapper.offsetHeight || 2500) * zoom)) * 100;
        
        // Calculate centered offset based on mapPanX/Y
        const centerX = 50 - (mapPanX / (2500 * zoom)) * 100;
        const centerY = 50 - (mapPanY / ((mapWrapper.offsetHeight || 2500) * zoom)) * 100;

        radarViewport.style.width = `${w}%`;
        radarViewport.style.height = `${h}%`;
        radarViewport.style.left = `${centerX - w/2}%`;
        radarViewport.style.top = `${centerY - h/2}%`;
    };

    const zoomIn = () => {
        const oldZoom = mapZoom;
        mapZoom = Math.min(mapZoom + 0.15, 3);
        const ratio = mapZoom / oldZoom;
        mapPanX *= ratio;
        mapPanY *= ratio;
        updateMapTransform();
    };

    const zoomOut = () => {
        const minZ = getMinZoom();
        const oldZoom = mapZoom;
        mapZoom = Math.max(mapZoom - 0.15, minZ);
        const ratio = mapZoom / oldZoom;
        mapPanX *= ratio;
        mapPanY *= ratio;
        updateMapTransform();
    };

    const resetMap = () => {
        mapZoom = getMinZoom();
        mapPanX = 0;
        mapPanY = 0;
        updateMapTransform();
    };

    const focusOnMap = (id) => {
        const patrol = patrols.find(p => p.id === id);
        if (!patrol) return;
        
        // Ensure image base dimensions are loaded. Fallback to 2500.
        const baseW = 2500;
        const baseH = mapWrapper.offsetHeight || 2500;

        // The point inside the map-wrapper (which is 2500 x H)
        // x and y are percentages (0 to 100)
        // Convert to pixel offset from the center of the wrapper
        const offsetX = (patrol.x / 100 - 0.5) * baseW;
        const offsetY = (patrol.y / 100 - 0.5) * baseH;

        // Zoom in to a comfortable level (e.g. 1.2), but not smaller than minZoom
        const minZ = getMinZoom();
        mapZoom = Math.max(1.2, minZ);
        
        // Pan so that the target offset is centered
        mapPanX = -offsetX * mapZoom;
        mapPanY = -offsetY * mapZoom;
        
        updateMapTransform();
        
        // Visual cue on the marker
        const markerEl = document.querySelector(`.marker[data-id="${id}"] > div`);
        if (markerEl) {
            markerEl.classList.add('ring-4', 'ring-white', 'scale-125');
            setTimeout(() => {
                markerEl.classList.remove('ring-4', 'ring-white', 'scale-125');
            }, 1000);
        }
    };

    document.getElementById('map-zoom-in').addEventListener('click', zoomIn);
    document.getElementById('map-zoom-out').addEventListener('click', zoomOut);
    document.getElementById('map-reset').addEventListener('click', resetMap);

    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    });

    mapWrapper.addEventListener('mousedown', (e) => {
        // Prevent map pan if we are dragging a marker
        if (e.target.closest('.marker') || e.button !== 0) return;
        
        isPanningMap = true;
        mapPanStartX = e.clientX;
        mapPanStartY = e.clientY;
        mapInitialPanX = mapPanX;
        mapInitialPanY = mapPanY;
        
        document.addEventListener('mousemove', handleMapPan);
        document.addEventListener('mouseup', stopMapPan);
    });

    function handleMapPan(e) {
        if (!isPanningMap) return;
        const dx = e.clientX - mapPanStartX;
        const dy = e.clientY - mapPanStartY;
        mapPanX = mapInitialPanX + dx;
        mapPanY = mapInitialPanY + dy;
        updateMapTransform();
    }

    function stopMapPan() {
        isPanningMap = false;
        document.removeEventListener('mousemove', handleMapPan);
        document.removeEventListener('mouseup', stopMapPan);
    }
    
    // --- DRAG AND DROP LOGIC ---
    
    let isDragging = false;
    let hasDraggedMarker = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let markerStartX = 0;
    let markerStartY = 0;
    let draggedElement = null;

    function handleDragStart(e) {
        if (e.button !== 0) return; // Only left click
        
        isDragging = true;
        hasDraggedMarker = false;
        draggedElement = e.currentTarget;
        draggedMarkerId = draggedElement.dataset.id;
        
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        const patrol = patrols.find(p => p.id === draggedMarkerId);
        
        markerStartX = patrol.x;
        markerStartY = patrol.y;
        
        draggedElement.classList.add('dragging');
        
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        
        e.stopPropagation();
        e.preventDefault();
    }
    
    function handleDragMove(e) {
        if (!isDragging || !draggedElement) return;
        
        // If mouse moved more than 3 pixels, we consider it a drag
        if (Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3) {
            hasDraggedMarker = true;
        }
        
        const rect = mapWrapper.getBoundingClientRect();
        
        // Calculate diff in percentage based on mapWrapper (which could be zoomed)
        const dx = ((e.clientX - dragStartX) / rect.width) * 100;
        const dy = ((e.clientY - dragStartY) / rect.height) * 100;
        
        let newX = markerStartX + dx;
        let newY = markerStartY + dy;
        
        // Clamp to bounds
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
        
        draggedElement.style.left = `${newX}%`;
        draggedElement.style.top = `${newY}%`;
        
        // Update patrol data temporarily
        const patrol = patrols.find(p => p.id === draggedMarkerId);
        if (patrol) {
            patrol.x = newX;
            patrol.y = newY;
        }
    }
    
    function handleDragEnd() {
        if (!isDragging) return;
        
        isDragging = false;
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
        }
        
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        
        draggedElement = null;
        draggedMarkerId = null;
        
        saveState();
        
        // Reset the flag after a short delay so the click event doesn't trigger
        setTimeout(() => {
            hasDraggedMarker = false;
        }, 50);
    }

    window.addEventListener('resize', () => {
        // Just re-apply transform to respect new minZoom if resized
        updateMapTransform();
    });

    // --- ACTIONS (Handled by Presets and Hotbar now) ---
    
    const addPatrol = (type) => {
        const id = 'patrol_' + Date.now();
        const isVehicle = type === 'vehicle';
        
        const newPatrol = {
            id,
            name: isVehicle ? `Fahrzeug ${patrols.length + 1}` : `Fußstreife ${patrols.length + 1}`,
            type, // 'foot' | 'vehicle'
            status: '10-08 | Statusabfrage',
            info: '',
            personnel: [],
            // Drop somewhat in the center
            x: 50 + (Math.random() * 10 - 5),
            y: 50 + (Math.random() * 10 - 5)
        };
        
        patrols.push(newPatrol);
        renderAll();
        openModal(id);
    };
    
    // --- MODAL LOGIC ---
    
    const openModal = (id) => {
        const patrol = patrols.find(p => p.id === id);
        if (!patrol) return;
        
        currentEditingId = id;
        
        // Populate modal
        nameInput.value = patrol.name;
        typeLabel.textContent = patrol.type === 'vehicle' ? 'Fahrzeugstreife' : 'Fußstreife';
        
        // Custom Dropdown Value
        currentSelectedStatus = patrol.status;
        statusSelectedText.textContent = currentSelectedStatus;
        
        infoTextarea.value = patrol.info || '';
        
        const iconName = patrol.type === 'vehicle' ? 'car' : 'footprints';
        modalIcon.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 ${patrol.type === 'vehicle' ? 'text-bw-gold' : 'text-blue-400'}"></i>`;
        
        renderModalPersonnel();
        
        // Show Sidebar
        modal.classList.remove('translate-x-full');
        modal.classList.add('translate-x-0');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    
    const closeModal = () => {
        modal.classList.remove('translate-x-0');
        modal.classList.add('translate-x-full');
        currentEditingId = null;
    };
    
    const renderModalPersonnel = () => {
        const patrol = patrols.find(p => p.id === currentEditingId);
        if (!patrol) return;
        
        personnelList.innerHTML = '';
        
        if (patrol.personnel.length === 0) {
            personnelList.innerHTML = '<div class="text-xs text-gray-500 italic">Keine Personen zugewiesen</div>';
            return;
        }
        
        patrol.personnel.forEach((person, index) => {
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between bg-black/30 border border-white/5 rounded px-3 py-2 text-sm';
            el.innerHTML = `
                <div class="flex items-center gap-2">
                    <i data-lucide="user" class="w-4 h-4 text-gray-400"></i>
                    <span class="text-gray-200">${escapeHTML(person)}</span>
                </div>
                <button class="text-gray-500 hover:text-red-400 transition-colors remove-person" data-index="${index}">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            `;
            personnelList.appendChild(el);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-person').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                removePerson(index);
            });
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    
    addPersonBtn.addEventListener('click', () => {
        const person = personnelInput.value.trim();
        if (!person) return;
        
        const patrol = patrols.find(p => p.id === currentEditingId);
        if (patrol && !patrol.personnel.includes(person)) {
            patrol.personnel.push(person);
            personnelInput.value = '';
            renderModalPersonnel();
        }
    });

    // Allow pressing Enter in input
    personnelInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addPersonBtn.click();
        }
    });
    
    const removePerson = (index) => {
        const patrol = patrols.find(p => p.id === currentEditingId);
        if (patrol) {
            patrol.personnel.splice(index, 1);
            renderModalPersonnel();
        }
    };
    
    saveBtn.addEventListener('click', () => {
        const patrol = patrols.find(p => p.id === currentEditingId);
        if (patrol) {
            patrol.name = nameInput.value || patrol.name;
            patrol.status = currentSelectedStatus;
            patrol.info = infoTextarea.value;
            
            renderAll();
            closeModal();
        }
    });
    
    deleteBtn.addEventListener('click', () => {
        if (confirm('Möchten Sie diese Streife wirklich auflösen?')) {
            patrols = patrols.filter(p => p.id !== currentEditingId);
            renderAll();
            closeModal();
        }
    });
    
    closeBtn.addEventListener('click', closeModal);

    // --- CUSTOM DROPDOWN LOGIC ---
    
    // --- CODES MODAL LOGIC ---
    
    if (openCodesBtn) {
        openCodesBtn.addEventListener('click', () => {
            codesModal.classList.remove('hidden');
            setTimeout(() => {
                codesModal.classList.remove('opacity-0');
                codesModalContent.classList.remove('scale-95');
            }, 10);
        });
    }

    const closeCodesModal = () => {
        codesModal.classList.add('opacity-0');
        codesModalContent.classList.add('scale-95');
        setTimeout(() => {
            codesModal.classList.add('hidden');
        }, 300);
    };

    closeCodesBtn.addEventListener('click', closeCodesModal);

    codesModal.addEventListener('click', (e) => {
        if (e.target === codesModal) {
            closeCodesModal();
        }
    });

    // --- CUSTOM DROPDOWN LOGIC ---
    
    const statusCodesGroups = [
        {
            name: '4.1 Codes',
            codes: [
                'Code 1 | Anfahrt ohne Sonderrechte',
                'Code 2 | Anfahrt mit Blaulicht',
                'Code 3 | Anfahrt mit Sonderrechten',
                'Code 4 | Einsatz beendet',
                'Code 5 | Geheime Ermittlung'
            ]
        },
        {
            name: '10-er Codes',
            codes: [
                '10-01 | Dienstantritt',
                '10-02 | Dienstende',
                '10-03 | Benötigte Einteilung',
                '10-04 | Verstanden / Einsatzbereit',
                '10-05 | Funkspruch wiederholen',
                '10-07 | Medic benötigt',
                '10-08 | Statusabfrage',
                '10-09 | Pause',
                '10-10 | Auf Anfahrt',
                '10-20 | Abholung benötigt',
                '10-30 | Standortabfrage',
                '10-80 | Aktive Verfolgungsjagd'
            ]
        },
        {
            name: '11-er & 20-er Codes',
            codes: [
                '11-20 | Soldat angeschossen',
                '11-99 | Unter Beschuss',
                '20-20 | Verstärkung benötigt'
            ]
        }
    ];

    const initCustomDropdown = () => {
        statusOptionsContainer.innerHTML = '';
        
        statusCodesGroups.forEach(group => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'px-4 py-2 text-xs font-bold uppercase tracking-widest text-bw-gold border-b border-white/10 bg-white/5';
            groupHeader.textContent = group.name;
            statusOptionsContainer.appendChild(groupHeader);
            
            group.codes.forEach(code => {
                const opt = document.createElement('div');
                opt.className = 'px-4 py-3 text-sm text-gray-300 hover:bg-bw-gold hover:text-black cursor-pointer transition-colors';
                opt.textContent = code;
                opt.addEventListener('click', () => {
                    currentSelectedStatus = code;
                    statusSelectedText.textContent = code;
                    statusOptionsContainer.classList.add('hidden');
                });
                statusOptionsContainer.appendChild(opt);
            });
        });
    };

    statusSelected.addEventListener('click', () => {
        statusOptionsContainer.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!customStatusDropdown.contains(e.target)) {
            statusOptionsContainer.classList.add('hidden');
        }
    });

    initCustomDropdown();

    // --- PERSONNEL POOL & DRAG ---

    const renderPool = () => {
        const poolContainer = document.getElementById('personnel-pool');
        poolContainer.innerHTML = personnelPool.map((name, i) => `
            <div class="bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2 py-1 rounded text-[10px] cursor-grab active:cursor-grabbing flex items-center gap-2" draggable="true" data-index="${i}" data-name="${name}">
                ${escapeHTML(name)}
                <i data-lucide="grip-vertical" class="w-2 h-2 opacity-50"></i>
            </div>
        `).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Drag events for pool items
        poolContainer.querySelectorAll('[draggable]').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', el.dataset.name);
                e.dataTransfer.setData('pool-index', el.dataset.index);
            });
        });
    };

    // Make markers drop targets
    const setupMarkerDropTarget = (el, patrolId) => {
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.classList.add('ring-4', 'ring-blue-500');
        });
        el.addEventListener('dragleave', () => {
            el.classList.remove('ring-4', 'ring-blue-500');
        });
        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('ring-4', 'ring-blue-500');
            const name = e.dataTransfer.getData('text/plain');
            const poolIndex = e.dataTransfer.getData('pool-index');
            
            if (name && poolIndex !== "") {
                const patrol = patrols.find(p => p.id === patrolId);
                if (patrol) {
                    patrol.personnel.push(name);
                    personnelPool.splice(parseInt(poolIndex), 1);
                    addLog(`${name} wurde ${patrol.name} zugewiesen.`, 'INFO');
                    saveState();
                    renderAll();
                    renderPool();
                }
            }
        });
    };

    // --- DRAWING & TACTICAL LOGIC ---

    const drawingLayer = document.getElementById('drawing-layer');

    const renderDrawing = () => {
        drawingLayer.innerHTML = '';
        // Tactical drawing (Waypoints/Measure) removed as per request
    };

    mapWrapper.addEventListener('click', (e) => {
        // If we are clicking a marker, don't trigger map click
        if (e.target !== mapImage && e.target !== mapWrapper) return;

        // Default: Deselect
        selectedPatrolId = null;
        renderAll();
    });

    // --- ULTIMATE RP FEATURES ---

    const addLog = (text, type = 'INFO') => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        rpLogs.unshift({ time, text, type });
        if (rpLogs.length > 50) rpLogs.pop();
        renderLogs();
    };

    const renderLogs = () => {
        const logContainer = document.getElementById('rp-log');
        logContainer.innerHTML = rpLogs.map(log => {
            const colorClass = log.type === 'CRITICAL' ? 'text-red-500' : log.type === 'WARN' ? 'text-yellow-500' : 'text-gray-400';
            return `
                <div class="border-l-2 border-white/10 pl-2 py-1">
                    <span class="text-[9px] text-bw-gold/50">${log.time}</span>
                    <span class="${colorClass} ml-1 font-bold">[${log.type}]</span>
                    <span class="text-white ml-1">${escapeHTML(log.text)}</span>
                </div>
            `;
        }).join('');
    };

    const createFromPreset = (preset) => {
        const callsings = {
            feldjaeger: 'Alpha',
            sanitaeter: 'Medusa',
            infanterie: 'Bravo',
            luft: 'Eagle'
        };
        
        const count = patrols.filter(p => p.name.startsWith(callsings[preset])).length + 1;
        const name = `${callsings[preset]} ${count}-1`;
        
        const newPatrol = {
            id: 'patrol_' + Date.now(),
            name: name,
            type: preset === 'luft' ? 'vehicle' : 'foot',
            status: '10-04 | Verstanden / Einsatzbereit',
            info: `Preset: ${preset}`,
            personnel: [],
            x: 50,
            y: 50
        };
        
        patrols.push(newPatrol);
        addLog(`Einheit ${name} (${preset}) erstellt.`, 'INFO');
        saveState();
        renderAll();
        focusOnMap(newPatrol.id);
    };

    // Sidebar Toggle
    document.getElementById('toggle-sidebar-left').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar-left');
        const icon = document.getElementById('toggle-icon-left');
        isSidebarCollapsed = !isSidebarCollapsed;
        
        if (isSidebarCollapsed) {
            sidebar.classList.add('sidebar-collapsed');
            icon.setAttribute('data-lucide', 'chevron-right');
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            icon.setAttribute('data-lucide', 'chevron-left');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // Snapshots
    document.getElementById('btn-snapshot-save').addEventListener('click', () => {
        const snapshot = JSON.stringify({ patrols, rpLogs });
        localStorage.setItem('bwrp_leitstelle_snapshot', snapshot);
        addLog('System-Snapshot manuell gespeichert.', 'WARN');
        alert('Snapshot gespeichert!');
    });

    document.getElementById('btn-snapshot-load').addEventListener('click', () => {
        const snapshot = localStorage.getItem('bwrp_leitstelle_snapshot');
        if (snapshot) {
            const data = JSON.parse(snapshot);
            patrols.length = 0;
            patrols.push(...data.patrols);
            rpLogs.length = 0;
            rpLogs.push(...(data.rpLogs || []));
            addLog('System-Snapshot geladen.', 'CRITICAL');
            renderAll();
        }
    });

    const showCustomConfirm = (message, callback) => {
        const modal = document.getElementById('confirm-modal');
        const modalContent = modal.querySelector('div.bg-bw-dark');
        const messageEl = document.getElementById('confirm-message');
        const proceedBtn = document.getElementById('confirm-proceed');
        const cancelBtn = document.getElementById('confirm-cancel');
        
        if (!modal || !proceedBtn || !cancelBtn) return console.error('Confirm Modal Elements not found');

        messageEl.textContent = message;
        modal.classList.remove('hidden');
        
        // Force reflow for animation
        modal.offsetHeight;
        
        modal.classList.remove('opacity-0');
        if (modalContent) modalContent.classList.remove('scale-95');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        const close = () => {
            modal.classList.add('opacity-0');
            if (modalContent) modalContent.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
        };
        
        proceedBtn.onclick = (e) => {
            e.preventDefault();
            // 1. Perform the action (Clear/Load/Delete)
            callback();
            
            // 2. Wait for a frame so the UI update is visible to the user
            requestAnimationFrame(() => {
                close();
            });
        };
        cancelBtn.onclick = (e) => {
            e.preventDefault();
            close();
        };
        
        // Close on ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    };

    document.getElementById('btn-clear-all').addEventListener('click', (e) => {
        e.preventDefault();
        showCustomConfirm('Möchten Sie wirklich die gesamte Leitstelle zurücksetzen? Alle Einheiten, Logs und das Personal im Pool werden gelöscht.', () => {
            patrols.length = 0;
            rpLogs.length = 0;
            personnelPool.length = 0;
            replayHistory.length = 0;
            
            localStorage.removeItem('bwrp_leitstelle_patrols');
            localStorage.removeItem('bwrp_leitstelle_logs');
            localStorage.removeItem('bwrp_leitstelle_pool');
            localStorage.removeItem('bwrp_leitstelle_notes');
            
            addLog('System VOLLSTÄNDIG zurückgesetzt.', 'CRITICAL');
            renderAll();
            renderPool();
            renderLogs();
        });
    });

    document.getElementById('btn-share-state').addEventListener('click', () => {
        const state = {
            patrols,
            rpLogs,
            personnelPool,
            notes: document.getElementById('leitstelle-notes').value,
            timestamp: Date.now()
        };
        
        try {
            const json = JSON.stringify(state);
            const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode('0x' + p1);
            }));
            
            const url = new URL(window.location.href);
            url.searchParams.set('s', base64);
            
            navigator.clipboard.writeText(url.href).then(() => {
                addLog('Teilbarer Link in Zwischenablage kopiert!', 'INFO');
                showCustomConfirm('Link kopiert! Sie können diesen Link nun an andere Dispatcher senden. Möchten Sie den Link in einem neuen Tab testen?', () => {
                    window.open(url.href, '_blank');
                });
            });
        } catch (e) {
            console.error('Sharing failed', e);
            addLog('Fehler beim Generieren des Links.', 'CRITICAL');
        }
    });

    // Handle incoming shared state
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('s');
    if (sharedData) {
        setTimeout(() => {
            showCustomConfirm('Ein geteilter Leitstellen-Zustand wurde gefunden. Möchten Sie diese Daten laden? (Aktuelle lokale Daten werden überschrieben)', () => {
                try {
                    const json = decodeURIComponent(atob(sharedData).split('').map((c) => {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    
                    const data = JSON.parse(json);
                    
                    patrols.length = 0;
                    patrols.push(...(data.patrols || []));
                    
                    rpLogs.length = 0;
                    rpLogs.push(...(data.rpLogs || []));
                    
                    personnelPool.length = 0;
                    personnelPool.push(...(data.personnelPool || []));
                    
                    if (data.notes) {
                        document.getElementById('leitstelle-notes').value = data.notes;
                        localStorage.setItem('bwrp_leitstelle_notes', data.notes);
                    }
                    
                    addLog('Geteilter Zustand erfolgreich geladen!', 'INFO');
                    saveState();
                    renderAll();
                    renderPool();
                    renderLogs();
                    
                    // Clean URL to avoid re-prompting on refresh
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (e) {
                    console.error('Import failed', e);
                    addLog('Fehler beim Laden des geteilten Zustands.', 'CRITICAL');
                }
            });
        }, 1000);
    }

    // Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => createFromPreset(btn.dataset.preset));
    });

    // Quick Log Buttons
    document.querySelectorAll('.quick-log').forEach(btn => {
        btn.addEventListener('click', () => {
            addLog(btn.dataset.text, btn.dataset.type || 'INFO');
        });
    });

    // Replay System
    const recordHistory = () => {
        if (isReplaying) return;
        replayHistory.push(JSON.parse(JSON.stringify(patrols)));
        if (replayHistory.length > 60) replayHistory.shift(); // Keep last 10 mins (every 10s)
    };

    setInterval(recordHistory, 10000);

    const startReplay = () => {
        if (replayHistory.length < 2) {
            addLog('Nicht genug Daten für Replay.', 'WARN');
            return;
        }
        isReplaying = true;
        let index = 0;
        addLog('SITUATIONS-REPLAY GESTARTET', 'WARN');
        
        const originalPatrols = JSON.parse(JSON.stringify(patrols));
        
        const interval = setInterval(() => {
            if (index >= replayHistory.length) {
                clearInterval(interval);
                isReplaying = false;
                patrols.length = 0;
                patrols.push(...originalPatrols);
                addLog('REPLAY BEENDET', 'INFO');
                renderAll();
                return;
            }
            
            patrols.length = 0;
            patrols.push(...replayHistory[index]);
            renderAll();
            index++;
        }, 500);
    };

    // --- EVENT LISTENERS ---

    // Log Input
    document.getElementById('log-send').addEventListener('click', () => {
        const input = document.getElementById('log-input');
        if (input.value) {
            addLog(input.value, 'INFO');
            input.value = '';
        }
    });

    document.getElementById('log-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('log-send').click();
    });

    // Hotbar Actions
    const addOptionsMenu = document.getElementById('add-options-menu');
    
    document.getElementById('hot-add').addEventListener('click', (e) => {
        addOptionsMenu.classList.toggle('hidden');
        e.stopPropagation();
    });

    document.getElementById('hot-add-foot').addEventListener('click', () => {
        createFromPreset('infanterie');
        addOptionsMenu.classList.add('hidden');
    });

    document.getElementById('hot-add-vehicle').addEventListener('click', () => {
        const id = 'patrol_' + Date.now();
        const newPatrol = {
            id,
            name: `Fahrzeug ${patrols.length + 1}`,
            type: 'vehicle',
            status: '10-04 | Verstanden / Einsatzbereit',
            info: '',
            personnel: [],
            x: 50,
            y: 50
        };
        patrols.push(newPatrol);
        addLog(`Einheit ${newPatrol.name} erstellt.`, 'INFO');
        saveState();
        renderAll();
        focusOnMap(id);
        addOptionsMenu.classList.add('hidden');
    });

    // Close menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!addOptionsMenu.classList.contains('hidden') && !e.target.closest('.relative')) {
            addOptionsMenu.classList.add('hidden');
        }
    });

    document.getElementById('hot-attention').addEventListener('click', () => {
        if (!selectedPatrolId) return;
        const marker = document.querySelector(`.marker[data-id="${selectedPatrolId}"]`);
        if (marker) {
            marker.classList.add('attention');
            addLog(`ALARM FÜR ${selectedPatrolId}!`, 'CRITICAL');
            setTimeout(() => marker.classList.remove('attention'), 5000);
        }
    });

    document.getElementById('hot-delete').addEventListener('click', () => {
        if (selectedPatrolId) {
            const patrol = patrols.find(p => p.id === selectedPatrolId);
            showCustomConfirm(`Möchten Sie die Einheit ${patrol ? patrol.name : ''} wirklich auflösen?`, () => {
                const index = patrols.findIndex(p => p.id === selectedPatrolId);
                if (index !== -1) {
                    addLog(`Einheit ${patrols[index].name} aufgelöst.`, 'WARN');
                    patrols.splice(index, 1);
                    selectedPatrolId = null;
                    saveState();
                    renderAll();
                }
            });
        }
    });

    document.getElementById('hot-undo').addEventListener('click', () => {
        if (selectedPatrolId) {
            const p = patrols.find(pt => pt.id === selectedPatrolId);
            if (p && p.waypoints) {
                p.waypoints.pop();
                renderDrawing();
                addLog(`Letzter Wegpunkt von ${p.name} entfernt.`, 'WARN');
            }
        }
    });

    document.getElementById('hot-replay').addEventListener('click', startReplay);

    // Notepad Toggle
    const notepad = document.getElementById('floating-notepad');
    const notepadTextarea = document.getElementById('leitstelle-notes');

    document.getElementById('toggle-notepad').addEventListener('click', () => {
        notepad.classList.toggle('hidden');
        if (!notepad.classList.contains('hidden')) {
            notepadTextarea.focus();
        }
    });

    document.getElementById('close-notepad').addEventListener('click', () => {
        notepad.classList.add('hidden');
    });

    // Save notepad to localStorage
    notepadTextarea.addEventListener('input', (e) => {
        localStorage.setItem('bwrp_leitstelle_notes', e.target.value);
    });

    // Load notepad content
    const savedNotes = localStorage.getItem('bwrp_leitstelle_notes');
    if (savedNotes) {
        notepadTextarea.value = savedNotes;
    }

    // Map Coordinates Hover
    mapContainer.addEventListener('mousemove', (e) => {
        const rect = mapContainer.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / rect.width * 10000);
        const y = Math.round((e.clientY - rect.top) / rect.height * 10000);
        document.getElementById('coord-x').textContent = x.toString().padStart(4, '0');
        document.getElementById('coord-y').textContent = y.toString().padStart(4, '0');
    });

    // Hotkeys
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === 'Delete') document.getElementById('hot-delete').click();
        if (e.key === 'n') document.getElementById('hot-add').click();
        if (e.key === 'a') document.getElementById('hot-attention').click();
        if (e.key === 'r') document.getElementById('hot-replay').click();
        
        // Undo mock (simple clear last waypoint or patrol)
        if (e.ctrlKey && e.key === 'z') {
            document.getElementById('hot-undo').click();
        }
    });

    // Personnel Pool Actions
    document.getElementById('pool-add').addEventListener('click', () => {
        const input = document.getElementById('pool-input');
        if (input.value) {
            personnelPool.push(input.value);
            input.value = '';
            renderPool();
            saveState();
        }
    });

    // Add Replay Button to Hotbar or Sidebar? Let's add it to Hotbar.
    // Wait, let's just use the button in the action bar if it exists.
    // I will add a button for Replay in the next step or use console.
    
    // Initial State load
    const savedLogs = localStorage.getItem('bwrp_leitstelle_logs');
    if (savedLogs) {
        rpLogs.push(...JSON.parse(savedLogs));
        renderLogs();
    }

    const savedPool = localStorage.getItem('bwrp_leitstelle_pool');
    if (savedPool) {
        personnelPool.push(...JSON.parse(savedPool));
        renderPool();
    }

    // Auto-save
    setInterval(() => {
        localStorage.setItem('bwrp_leitstelle_logs', JSON.stringify(rpLogs));
        localStorage.setItem('bwrp_leitstelle_pool', JSON.stringify(personnelPool));
    }, 5000);

    // Initial render
    renderAll();
    renderPool();
    renderDrawing();
    
    // Utility to prevent XSS
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
