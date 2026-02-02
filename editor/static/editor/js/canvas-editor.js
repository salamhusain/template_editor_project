class CanvasEditor {
    constructor(canvasId, templateImageUrl) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.elements = [];
        this.selectedElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.dragStart = { x: 0, y: 0 };
        this.templateImage = null;
        this.currentDesignId = null;
        
        this.loadTemplateImage(templateImageUrl);
        this.setupEventListeners();
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
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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
        if (!this.isDragging || !this.selectedElement) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.selectedElement.x = x - this.dragStart.x;
        this.selectedElement.y = y - this.dragStart.y;
        this.render();
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
    }

    onDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (let i = this.elements.length - 1; i >= 0; i--) {
            const elem = this.elements[i];
            if (this.isPointInElement(x, y, elem) && elem.type === 'text') {
                const newText = prompt('Edit text:', elem.text);
                if (newText !== null) {
                    elem.text = newText;
                    this.render();
                }
                return;
            }
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
                rotation: 0
            };
            this.elements.push(element);
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

                // Draw selection box
                if (elem === this.selectedElement) {
                    const metrics = this.ctx.measureText(elem.text);
                    this.ctx.strokeStyle = '#007bff';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.strokeRect(elem.x - 2, elem.y - elem.fontSize - 2, 
                                       metrics.width + 4, elem.fontSize + 4);
                    this.ctx.setLineDash([]);
                }
            } else if (elem.type === 'image' && elem.image) {
                this.ctx.translate(elem.x + elem.width / 2, elem.y + elem.height / 2);
                this.ctx.rotate((elem.rotation * Math.PI) / 180);
                this.ctx.drawImage(elem.image, -elem.width / 2, -elem.height / 2, 
                                  elem.width, elem.height);

                // Draw selection box
                if (elem === this.selectedElement) {
                    this.ctx.strokeStyle = '#007bff';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.strokeRect(-elem.width / 2 - 2, -elem.height / 2 - 2, 
                                       elem.width + 4, elem.height + 4);
                    this.ctx.setLineDash([]);
                }
            }

            this.ctx.restore();
        });
    }

    getCanvasData() {
        return {
            elements: this.elements.map(elem => {
                if (elem.type === 'image') {
                    return {
                        ...elem,
                        image: elem.image.src,
                        imageData: null
                    };
                }
                return elem;
            })
        };
    }

    loadCanvasData(data) {
        this.elements = [];
        if (data && data.elements) {
            data.elements.forEach(elem => {
                if (elem.type === 'image') {
                    this.addImage(elem.image, null);
                    const lastElem = this.elements[this.elements.length - 1];
                    lastElem.x = elem.x;
                    lastElem.y = elem.y;
                    lastElem.width = elem.width;
                    lastElem.height = elem.height;
                    lastElem.rotation = elem.rotation;
                } else {
                    this.elements.push(elem);
                }
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
        return this.canvas.toDataURL('image/png');
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
                    alert('Image uploaded and added to canvas!');
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
