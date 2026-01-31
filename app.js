// ==========================================
// Global State
// ==========================================
let pdfFiles = [];
let draggedElement = null;

// ==========================================
// DOM Elements
// ==========================================
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const fileList = document.getElementById('fileList');
const fileListSection = document.getElementById('fileListSection');
const clearBtn = document.getElementById('clearBtn');
const mergeBtn = document.getElementById('mergeBtn');
const actionSection = document.getElementById('actionSection');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// ==========================================
// Event Listeners
// ==========================================
selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});
fileInput.addEventListener('change', handleFileSelect);
clearBtn.addEventListener('click', clearAllFiles);
mergeBtn.addEventListener('click', mergePDFs);

// Drag and drop for upload area
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
// Click on upload area (but not on button)
uploadArea.addEventListener('click', (e) => {
    // Only trigger if clicking directly on upload area, not on the button
    if (e.target === uploadArea || (e.target.closest('.upload-area') && !e.target.closest('.btn'))) {
        fileInput.click();
    }
});

// ==========================================
// File Selection
// ==========================================
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
    fileInput.value = '';
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function addFiles(files) {
    const pdfFilesOnly = files.filter(file => file.type === 'application/pdf');

    if (pdfFilesOnly.length === 0) {
        showToast('请选择PDF文件', 'error');
        return;
    }

    if (pdfFilesOnly.length !== files.length) {
        showToast(`已过滤 ${files.length - pdfFilesOnly.length} 个非PDF文件`, 'warning');
    }

    pdfFiles.push(...pdfFilesOnly);
    updateFileList();
    showToast(`成功添加 ${pdfFilesOnly.length} 个PDF文件`, 'success');
}

// ==========================================
// File List Management
// ==========================================
function updateFileList() {
    fileList.innerHTML = '';

    if (pdfFiles.length === 0) {
        fileListSection.classList.remove('active');
        mergeBtn.disabled = true;
        return;
    }

    fileListSection.classList.add('active');
    mergeBtn.disabled = false;

    pdfFiles.forEach((file, index) => {
        const fileItem = createFileItem(file, index);
        fileList.appendChild(fileItem);
    });
}

function createFileItem(file, index) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.draggable = true;
    item.dataset.index = index;

    item.innerHTML = `
        <svg class="drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <div class="file-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
            </svg>
        </div>
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
        </div>
        <button class="file-remove" onclick="removeFile(${index})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

    // Drag and drop for reordering
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOverItem);
    item.addEventListener('drop', handleDropItem);
    item.addEventListener('dragend', handleDragEnd);

    return item;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function removeFile(index) {
    pdfFiles.splice(index, 1);
    updateFileList();
    showToast('文件已移除', 'info');
}

function clearAllFiles() {
    pdfFiles = [];
    updateFileList();
    showToast('已清空所有文件', 'info');
}

// ==========================================
// Drag and Drop for Reordering
// ==========================================
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOverItem(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(fileList, e.clientY);
    const dragging = document.querySelector('.dragging');

    if (afterElement == null) {
        fileList.appendChild(dragging);
    } else {
        fileList.insertBefore(dragging, afterElement);
    }

    return false;
}

function handleDropItem(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Reorder the pdfFiles array based on new DOM order
    const items = Array.from(fileList.children);
    const newOrder = items.map(item => parseInt(item.dataset.index));
    pdfFiles = newOrder.map(index => pdfFiles[index]);

    updateFileList();

    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==========================================
// PDF Merging
// ==========================================
async function mergePDFs() {
    if (pdfFiles.length < 1) {
        showToast('请至少添加1个PDF文件', 'warning');
        return;
    }

    // Ask user for filename
    const defaultName = pdfFiles.length === 1 ?
        pdfFiles[0].name.replace('.pdf', '') + '-副本' :
        '合并文档';

    const fileName = prompt('请输入保存的文件名（不需要输入.pdf后缀）:', defaultName);

    if (fileName === null) {
        // User cancelled
        return;
    }

    if (!fileName || fileName.trim() === '') {
        showToast('文件名不能为空', 'warning');
        return;
    }

    try {
        mergeBtn.disabled = true;
        progressContainer.classList.add('active');
        updateProgress(0, '正在初始化...');

        // Create a new PDF document
        const mergedPdf = await PDFLib.PDFDocument.create();

        // Process each PDF file
        for (let i = 0; i < pdfFiles.length; i++) {
            updateProgress(
                ((i + 1) / pdfFiles.length) * 90,
                `正在处理 ${i + 1}/${pdfFiles.length}: ${pdfFiles[i].name}`
            );

            try {
                const fileBuffer = await pdfFiles[i].arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(fileBuffer, {
                    ignoreEncryption: true
                });
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

                copiedPages.forEach((page) => {
                    mergedPdf.addPage(page);
                });
            } catch (fileError) {
                console.error(`Error processing file ${pdfFiles[i].name}:`, fileError);
                showToast(`处理文件 ${pdfFiles[i].name} 时出错，跳过该文件`, 'warning');
                continue;
            }

            // Small delay for visual feedback
            await sleep(100);
        }

        // Check if we have any pages
        const pageCount = mergedPdf.getPageCount();
        if (pageCount === 0) {
            throw new Error('No valid pages to merge');
        }

        updateProgress(95, '正在生成最终文件...');

        // Save the merged PDF with proper options
        const mergedPdfBytes = await mergedPdf.save({
            useObjectStreams: false,
            addDefaultPage: false,
            objectsPerTick: 50
        });

        updateProgress(100, '完成！');

        // Download the file
        downloadPDF(mergedPdfBytes, fileName.trim());

        setTimeout(() => {
            progressContainer.classList.remove('active');
            mergeBtn.disabled = false;
            showToast(`PDF合并成功！共 ${pageCount} 页`, 'success');
        }, 500);

    } catch (error) {
        console.error('Error merging PDFs:', error);
        progressContainer.classList.remove('active');
        mergeBtn.disabled = false;
        showToast('合并失败：' + error.message, 'error');
    }
}

function updateProgress(percentage, text) {
    progressFill.style.width = percentage + '%';
    progressText.textContent = text;
}

function downloadPDF(pdfBytes, fileName) {
    try {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Use provided filename or generate with timestamp
        let downloadName = fileName || '合并文档';
        // Remove any existing .pdf extension
        downloadName = downloadName.replace(/\.pdf$/i, '');
        // Add .pdf extension
        link.download = `${downloadName}.pdf`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up - wait longer to ensure download starts
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        console.log(`PDF downloaded: ${link.download}, size: ${pdfBytes.length} bytes`);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        showToast('下载失败：' + error.message, 'error');
    }
}

// ==========================================
// Toast Notifications
// ==========================================
function showToast(message, type = 'info') {
    toastMessage.textContent = message;

    // Update icon based on type
    const toastIcon = toast.querySelector('.toast-icon');
    if (type === 'success') {
        toastIcon.innerHTML = `
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        `;
        toastIcon.style.stroke = 'var(--color-accent-success)';
    } else if (type === 'error') {
        toastIcon.innerHTML = `
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        `;
        toastIcon.style.stroke = 'var(--color-accent-error)';
    } else if (type === 'warning') {
        toastIcon.innerHTML = `
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        `;
        toastIcon.style.stroke = 'var(--color-accent-warning)';
    } else {
        toastIcon.innerHTML = `
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        `;
        toastIcon.style.stroke = 'var(--color-accent-secondary)';
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==========================================
// Utility Functions
// ==========================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
