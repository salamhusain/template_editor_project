class CanvasEditor {
    constructor(canvasId, templateImageUrl) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.elements = [];
        this.selectedElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragStart = { x: 0, y: 0 };
        this.templateImage = null;
        this.currentDesignId = null;
        this.editModal = null;
        this.lastTap = 0;
        this.tapTimeout = null;
        
        // Detect device type
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.handleSize = this.isMobile ? 20 : 10; // Larger handles for mobile
        
        this.loadTemplateImage(templateImageUrl);
        this.setupEventListeners();
        this.setupResponsive();
        this.setupEditModal();
    }

    setupResponsive() {
        window.addEventListener('resize', () => {
            this.render();
        });
    }

    setupEditModal() {
        // Initialize Bootstrap modal
        const modalElement = document.getElementById('editTextModal');
        this.editModal = new bootstrap.Modal(modalElement);

        // Color picker sync
        const colorInput = document.getElementById('editTextColor');
        const colorHex = document.getElementById('editTextColorHex');

        colorInput.addEventListener('input', (e) => {
            colorHex.value = e.target.value.toUpperCase();
        });

        colorHex.addEventListener('input', (e) => {
            let color = e.target.value;
            if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
                colorInput.value = color;
            }
        });

        // Color preset buttons
        document.querySelectorAll('.color-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                colorInput.value = color;
                colorHex.value = color;
            });
        });

        // Font size slider
        const fontSizeSlider = document.getElementById('editFontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');

        fontSizeSlider.addEventListener('input', (e) => {
            fontSizeValue.textContent = e.target.value;
        });

        // Save button
        document.getElementById('saveTextChanges').addEventListener('click', () => {
            this.saveTextEdits();
        });
    }

    loadTemplateImage(url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.templateImage = img;
            this.render();
        };
        img.src = url;
    }

    setupEventListeners() {
        // Mouse events for desktop
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
        
        // Touch events for mobile/tablet
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    onTouchStart(e) {
        e.preventDefault();
        
        const currentTime = new Date().getTime();
        const tapLength = currentTime - this.lastTap;
        
        // Double tap detection (within 300ms)
        if (tapLength < 300 && tapLength > 0) {
            this.onDoubleTap(e);
            this.lastTap = 0;
            return;
        }
        
        this.lastTap = currentTime;
        
        const pos = this.getTouchPos(e);
        this.handleMouseDown(pos.x, pos.y);
    }

    onTouchMove(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.handleMouseMove(pos.x, pos.y);
    }

    onTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp();
    }

    onDoubleTap(e) {
        const pos = this.getTouchPos(e);
        
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const elem = this.elements[i];
            if (this.isPointInElement(pos.x, pos.y, elem) && elem.type === 'text') {
                this.openEditModal(elem);
                return;
            }
        }
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);
        this.handleMouseDown(pos.x, pos.y);
    }

    handleMouseDown(x, y) {
        // Check if clicking on a resize handle first
        if (this.selectedElement) {
            const handle = this.getResizeHandle(x, y, this.selectedElement);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.dragStart = { x, y };
                return;
            }
        }

        // Check if clicking on an element
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const elem = this.elements[i];
            if (this.isPointInElement(x, y, elem)) {
                this.selectedElement = elem;
                this.isDragging = true;
                this.dragStart = { x: x - elem.x, y: y - elem.y };
                this.render();
                return;
            }
        }

        this.selectedElement = null;
        this.render();
    }

    onMouseMove(e) {
        const pos = this.getMousePos(e);
        this.handleMouseMove(pos.x, pos.y);
        
        // Update cursor only on desktop
        if (!this.isMobile) {
            this.updateCursor(pos.x, pos.y);
        }
    }

    handleMouseMove(x, y) {
        if (this.isResizing && this.selectedElement) {
            this.resizeElement(x, y);
            this.render();
        } else if (this.isDragging && this.selectedElement) {
            this.selectedElement.x = x - this.dragStart.x;
            this.selectedElement.y = y - this.dragStart.y;
            this.render();
        }
    }

    onMouseUp(e) {
        this.handleMouseUp();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
    }

    updateCursor(x, y) {
        if (this.selectedElement) {
            const handle = this.getResizeHandle(x, y, this.selectedElement);
            if (handle) {
                if (handle === 'nw' || handle === 'se') {
                    this.canvas.style.cursor = 'nwse-resize';
                } else if (handle === 'ne' || handle === 'sw') {
                    this.canvas.style.cursor = 'nesw-resize';
                }
                return;
            }
        }
        
        // Check if over any element
        for (let i = this.elements.length - 1; i >= 0; i--) {
            if (this.isPointInElement(x, y, this.elements[i])) {
                this.canvas.style.cursor = 'move';
                return;
            }
        }
        
        this.canvas.style.cursor = 'default';
    }

    resizeElement(x, y) {
        const elem = this.selectedElement;
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;

        if (elem.type === 'text') {
            // Resize text by changing font size
            if (this.resizeHandle === 'se' || this.resizeHandle === 'ne' || 
                this.resizeHandle === 'sw' || this.resizeHandle === 'nw') {
                const scaleFactor = 1 + (dx / 100);
                elem.fontSize = Math.max(10, Math.min(200, elem.fontSize * scaleFactor));
                this.dragStart = { x, y };
            }
        } else if (elem.type === 'image') {
            // Store original aspect ratio
            if (!elem.originalAspectRatio) {
                elem.originalAspectRatio = elem.width / elem.height;
            }
            
            const aspectRatio = elem.originalAspectRatio;
            
            // Resize image while maintaining aspect ratio
            if (this.resizeHandle === 'se') {
                // Southeast corner - resize from bottom-right
                const newWidth = Math.max(50, elem.width + dx);
                const newHeight = newWidth / aspectRatio;
                elem.width = newWidth;
                elem.height = newHeight;
                
            } else if (this.resizeHandle === 'sw') {
                // Southwest corner - resize from bottom-left
                const newWidth = Math.max(50, elem.width - dx);
                const newHeight = newWidth / aspectRatio;
                elem.x += elem.width - newWidth;
                elem.width = newWidth;
                elem.height = newHeight;
                
            } else if (this.resizeHandle === 'ne') {
                // Northeast corner - resize from top-right
                const newWidth = Math.max(50, elem.width + dx);
                const newHeight = newWidth / aspectRatio;
                elem.y += elem.height - newHeight;
                elem.width = newWidth;
                elem.height = newHeight;
                
            } else if (this.resizeHandle === 'nw') {
                // Northwest corner - resize from top-left
                const newWidth = Math.max(50, elem.width - dx);
                const newHeight = newWidth / aspectRatio;
                elem.x += elem.width - newWidth;
                elem.y += elem.height - newHeight;
                elem.width = newWidth;
                elem.height = newHeight;
            }
            
            this.dragStart = { x, y };
        }
    }

    getResizeHandle(x, y, elem) {
        const handles = this.getResizeHandles(elem);
        const tolerance = this.handleSize * 1.5; // Larger touch tolerance

        for (let handle in handles) {
            const hx = handles[handle].x;
            const hy = handles[handle].y;
            if (Math.abs(x - hx) < tolerance && Math.abs(y - hy) < tolerance) {
                return handle;
            }
        }
        return null;
    }

    getResizeHandles(elem) {
        if (elem.type === 'text') {
            this.ctx.font = `${elem.fontSize}px ${elem.fontFamily}`;
            const metrics = this.ctx.measureText(elem.text);
            const width = metrics.width;
            const height = elem.fontSize;
            const x = elem.x;
            const y = elem.y - height;

            return {
                nw: { x: x, y: y },
                ne: { x: x + width, y: y },
                sw: { x: x, y: y + height },
                se: { x: x + width, y: y + height }
            };
        } else if (elem.type === 'image') {
            return {
                nw: { x: elem.x, y: elem.y },
                ne: { x: elem.x + elem.width, y: elem.y },
                sw: { x: elem.x, y: elem.y + elem.height },
                se: { x: elem.x + elem.width, y: elem.y + elem.height }
            };
        }
        return {};
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);

        for (let i = this.elements.length - 1; i >= 0; i--) {
            const elem = this.elements[i];
            if (this.isPointInElement(pos.x, pos.y, elem) && elem.type === 'text') {
                this.openEditModal(elem);
                return;
            }
        }
    }

    openEditModal(textElement) {
        // Set current values
        document.getElementById('editTextInput').value = textElement.text;
        document.getElementById('editTextColor').value = textElement.color;
        document.getElementById('editTextColorHex').value = textElement.color.toUpperCase();
        document.getElementById('editFontFamily').value = textElement.fontFamily;
        document.getElementById('editFontSize').value = textElement.fontSize;
        document.getElementById('fontSizeValue').textContent = textElement.fontSize;

        // Show modal
        this.editModal.show();
    }

    saveTextEdits() {
        if (this.selectedElement && this.selectedElement.type === 'text') {
            this.selectedElement.text = document.getElementById('editTextInput').value;
            this.selectedElement.color = document.getElementById('editTextColor').value;
            this.selectedElement.fontFamily = document.getElementById('editFontFamily').value;
            this.selectedElement.fontSize = parseInt(document.getElementById('editFontSize').value);

            this.render();
            this.editModal.hide();
        }
    }

    isPointInElement(x, y, elem) {
        if (elem.type === 'text') {
            this.ctx.font = `${elem.fontSize}px ${elem.fontFamily}`;
            const metrics = this.ctx.measureText(elem.text);
            const width = metrics.width;
            const height = elem.fontSize;
            
            return x >= elem.x && x <= elem.x + width &&
                   y >= elem.y - height && y <= elem.y;
        } else if (elem.type === 'image' && elem.image) {
            return x >= elem.x && x <= elem.x + elem.width &&
                   y >= elem.y && y <= elem.y + elem.height;
        }
        return false;
    }

    addText(text, fontFamily, fontSize, color) {
        const element = {
            type: 'text',
            text: text,
            x: 50,
            y: 100,
            fontFamily: fontFamily,
            fontSize: fontSize,
            color: color,
            rotation: 0
        };
        this.elements.push(element);
        this.selectedElement = element;
        this.render();
    }

    addImage(imageUrl, callback) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const maxWidth = this.canvas.width * 0.3;
            const maxHeight = this.canvas.height * 0.3;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (maxHeight / height) * width;
                height = maxHeight;
            }

            const element = {
                type: 'image',
                image: img,
                x: 50,
                y: 50,
                width: width,
                height: height,
                originalAspectRatio: width / height,
                rotation: 0
            };
            this.elements.push(element);
            this.selectedElement = element;
            this.render();
            if (callback) callback();
        };
        img.src = imageUrl;
    }

    deleteSelected() {
        if (this.selectedElement) {
            const index = this.elements.indexOf(this.selectedElement);
            if (index > -1) {
                this.elements.splice(index, 1);
                this.selectedElement = null;
                this.render();
            }
        }
    }

    bringToFront() {
        if (this.selectedElement) {
            const index = this.elements.indexOf(this.selectedElement);
            if (index > -1) {
                this.elements.splice(index, 1);
                this.elements.push(this.selectedElement);
                this.render();
            }
        }
    }

    sendToBack() {
        if (this.selectedElement) {
            const index = this.elements.indexOf(this.selectedElement);
            if (index > -1) {
                this.elements.splice(index, 1);
                this.elements.unshift(this.selectedElement);
                this.render();
            }
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw template
        if (this.templateImage) {
            this.ctx.drawImage(this.templateImage, 0, 0);
        }

        // Draw all elements
        this.elements.forEach(elem => {
            this.ctx.save();

            if (elem.type === 'text') {
                this.ctx.font = `${elem.fontSize}px ${elem.fontFamily}`;
                this.ctx.fillStyle = elem.color;
                this.ctx.fillText(elem.text, elem.x, elem.y);
            } else if (elem.type === 'image' && elem.image) {
                this.ctx.drawImage(elem.image, elem.x, elem.y, elem.width, elem.height);
            }

            this.ctx.restore();
        });

        // Draw selection and resize handles
        if (this.selectedElement) {
            this.drawSelection(this.selectedElement);
        }
    }

    drawSelection(elem) {
        this.ctx.save();
        
        if (elem.type === 'text') {
            this.ctx.font = `${elem.fontSize}px ${elem.fontFamily}`;
            const metrics = this.ctx.measureText(elem.text);
            const width = metrics.width;
            const height = elem.fontSize;
            const x = elem.x;
            const y = elem.y - height;

            // Draw selection box
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = this.isMobile ? 3 : 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
            this.ctx.setLineDash([]);

            // Draw resize handles
            this.drawHandle(x, y); // nw
            this.drawHandle(x + width, y); // ne
            this.drawHandle(x, y + height); // sw
            this.drawHandle(x + width, y + height); // se

        } else if (elem.type === 'image') {
            // Draw selection box
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = this.isMobile ? 3 : 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(elem.x - 5, elem.y - 5, elem.width + 10, elem.height + 10);
            this.ctx.setLineDash([]);

            // Draw resize handles
            this.drawHandle(elem.x, elem.y); // nw
            this.drawHandle(elem.x + elem.width, elem.y); // ne
            this.drawHandle(elem.x, elem.y + elem.height); // sw
            this.drawHandle(elem.x + elem.width, elem.y + elem.height); // se
        }

        this.ctx.restore();
    }

    drawHandle(x, y) {
        const radius = this.handleSize / 2;
        
        this.ctx.fillStyle = '#007bff';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = this.isMobile ? 3 : 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }

    getCanvasData() {
        return {
            elements: this.elements.map(elem => {
                if (elem.type === 'image') {
                    return {
                        type: elem.type,
                        x: elem.x,
                        y: elem.y,
                        width: elem.width,
                        height: elem.height,
                        rotation: elem.rotation,
                        originalAspectRatio: elem.originalAspectRatio,
                        image: elem.image.src
                    };
                }
                return elem;
            })
        };
    }

    loadCanvasData(data) {
        this.elements = [];
        if (data && data.elements) {
            const promises = [];
            
            data.elements.forEach(elem => {
                if (elem.type === 'image') {
                    const promise = new Promise((resolve) => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                            this.elements.push({
                                type: 'image',
                                image: img,
                                x: elem.x,
                                y: elem.y,
                                width: elem.width,
                                height: elem.height,
                                originalAspectRatio: elem.originalAspectRatio || (elem.width / elem.height),
                                rotation: elem.rotation || 0
                            });
                            resolve();
                        };
                        img.src = elem.image;
                    });
                    promises.push(promise);
                } else {
                    this.elements.push(elem);
                }
            });

            Promise.all(promises).then(() => {
                this.render();
            });
        }
        this.render();
    }

    downloadImage(filename) {
        const link = document.createElement('a');
        link.download = filename || 'design.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    getPreviewImage() {
        // Create a temporary canvas for smaller preview
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Scale down to max 800px width
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / this.canvas.width);
        
        tempCanvas.width = this.canvas.width * scale;
        tempCanvas.height = this.canvas.height * scale;
        
        // Draw scaled down version
        tempCtx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Return compressed JPEG instead of PNG (smaller file size)
        return tempCanvas.toDataURL('image/jpeg', 0.8); // 80% quality
    }
}

// Initialize editor
let editor;
window.addEventListener('DOMContentLoaded', () => {
    editor = new CanvasEditor('canvas', templateImageUrl);

    // Add Text Button
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = document.getElementById('textInput').value;
        const fontFamily = document.getElementById('fontFamily').value;
        const fontSize = parseInt(document.getElementById('fontSize').value);
        const color = document.getElementById('textColor').value;

        if (text.trim()) {
            editor.addText(text, fontFamily, fontSize, color);
            document.getElementById('textInput').value = '';
        } else {
            alert('Please enter some text');
        }
    });

    // Upload Image Button
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
        const fileInput = document.getElementById('imageUpload');
        const file = fileInput.files[0];

        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            fetch(uploadUserImageUrl, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    editor.addImage(data.image_url);
                    fileInput.value = '';
                    
                    // Add to user images list
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'col-6';
                    imgContainer.innerHTML = `
                        <img src="${data.image_url}" class="img-thumbnail user-image-thumb" 
                             style="cursor: pointer; width: 100%; height: 80px; object-fit: cover;"
                             data-url="${data.image_url}">
                    `;
                    document.getElementById('userImagesList').appendChild(imgContainer);
                    
                    // Add click event
                    imgContainer.querySelector('img').addEventListener('click', function() {
                        editor.addImage(this.dataset.url);
                    });
                } else {
                    alert('Error uploading image: ' + data.error);
                }
            });
        } else {
            alert('Please select an image');
        }
    });

    // User Images Click
    document.querySelectorAll('.user-image-thumb').forEach(img => {
        img.addEventListener('click', function() {
            editor.addImage(this.dataset.url);
        });
    });

    // Delete Button
    document.getElementById('deleteBtn').addEventListener('click', () => {
        editor.deleteSelected();
    });

    // Bring to Front Button
    document.getElementById('bringToFrontBtn').addEventListener('click', () => {
        editor.bringToFront();
    });

    // Send to Back Button
    document.getElementById('sendToBackBtn').addEventListener('click', () => {
        editor.sendToBack();
    });

    // Save Design Button
    document.getElementById('saveDesignBtn').addEventListener('click', () => {
        const designName = document.getElementById('designName').value;

        if (!designName.trim()) {
            alert('Please enter a design name');
            return;
        }

        const canvasData = editor.getCanvasData();
        const previewImage = editor.getPreviewImage();

        const payload = {
            design_name: designName,
            canvas_data: canvasData,
            template_id: templateId,
            preview_image: previewImage,
            design_id: editor.currentDesignId
        };

        fetch(saveDesignUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                editor.currentDesignId = data.design_id;
                alert(data.message);
            } else {
                alert('Error saving design: ' + data.error);
            }
        });
    });

    // Download Button
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const designName = document.getElementById('designName').value || 'design';
        editor.downloadImage(designName + '.png');
    });

    // Load existing design if design_id is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const designId = urlParams.get('design_id');
    if (designId) {
        fetch(`/load-design/${designId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    editor.loadCanvasData(data.canvas_data);
                    document.getElementById('designName').value = data.design_name;
                    editor.currentDesignId = designId;
                }
            });
    }
});
