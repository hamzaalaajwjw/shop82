import { showToast } from './toast.js';

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.currentModal = null;
    }
    
    async show(options) {
        return new Promise((resolve) => {
            const modalId = 'modal_' + Date.now();
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.id = modalId;
            
            modal.innerHTML = `
                <div class="modal-container ${options.size || 'medium'}">
                    <div class="modal-header">
                        <h3 class="modal-title">${options.title || ''}</h3>
                        <button class="modal-close" aria-label="إغلاق">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        ${options.content || options.message || ''}
                        
                        ${options.inputs ? this.renderInputs(options.inputs) : ''}
                        
                        ${options.buttons ? this.renderButtons(options.buttons, resolve) : ''}
                    </div>
                    
                    ${options.footer ? `
                        <div class="modal-footer">
                            ${options.footer}
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.getElementById('globalModals').appendChild(modal);
            
            // Add event listeners
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => {
                this.hide(modalId);
                resolve(false);
            });
            
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hide(modalId);
                    resolve(false);
                }
            });
            
            // Add to map
            this.modals.set(modalId, { element: modal, resolve });
            this.currentModal = modalId;
            
            // Show with animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Auto focus first input
            if (options.inputs) {
                setTimeout(() => {
                    const firstInput = modal.querySelector('input, textarea, select');
                    if (firstInput) firstInput.focus();
                }, 100);
            }
        });
    }
    
    renderInputs(inputs) {
        return inputs.map(input => `
            <div class="input-group">
                <label for="${input.id}">${input.label}</label>
                ${input.type === 'textarea' ? 
                    `<textarea id="${input.id}" 
                              placeholder="${input.placeholder || ''}"
                              ${input.required ? 'required' : ''}
                              ${input.rows ? `rows="${input.rows}"` : ''}>${input.value || ''}</textarea>` :
                    `<input type="${input.type || 'text'}" 
                           id="${input.id}"
                           value="${input.value || ''}"
                           placeholder="${input.placeholder || ''}"
                           ${input.required ? 'required' : ''}
                           ${input.min ? `min="${input.min}"` : ''}
                           ${input.max ? `max="${input.max}"` : ''}
                           ${input.step ? `step="${input.step}"` : ''}>`
                }
                ${input.help ? `<small class="input-help">${input.help}</small>` : ''}
            </div>
        `).join('');
    }
    
    renderButtons(buttons, resolve) {
        return `
            <div class="modal-actions">
                ${buttons.map((btn, index) => `
                    <button type="button" 
                            class="btn ${btn.type || 'secondary'} ${btn.className || ''}"
                            data-action="${btn.action || 'close'}"
                            data-result="${btn.result || index}">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    async hide(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) return;
        
        modal.element.classList.remove('show');
        
        setTimeout(() => {
            modal.element.remove();
            this.modals.delete(modalId);
            
            if (this.currentModal === modalId) {
                this.currentModal = null;
            }
        }, 300);
    }
    
    async hideAll() {
        for (const [modalId] of this.modals) {
            await this.hide(modalId);
        }
    }
    
    async showLoading(message = 'جاري التحميل...') {
        return this.show({
            title: '',
            content: `
                <div class="loading-modal">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `,
            closable: false,
            buttons: []
        });
    }
    
    async hideLoading() {
        if (this.currentModal) {
            await this.hide(this.currentModal);
        }
    }
    
    async confirm(options) {
        return this.show({
            title: options.title || 'تأكيد',
            message: options.message || 'هل أنت متأكد؟',
            buttons: [
                { text: options.cancelText || 'إلغاء', type: 'secondary' },
                { text: options.confirmText || 'تأكيد', type: 'primary' }
            ]
        }).then(result => result === 1);
    }
    
    async prompt(options) {
        return this.show({
            title: options.title || 'إدخال',
            inputs: [{
                id: 'prompt-input',
                label: options.label || 'القيمة:',
                type: options.type || 'text',
                value: options.value || '',
                placeholder: options.placeholder || '',
                required: true
            }],
            buttons: [
                { text: options.cancelText || 'إلغاء', type: 'secondary' },
                { text: options.confirmText || 'موافق', type: 'primary' }
            ]
        }).then(result => {
            if (result === 1) {
                const input = document.getElementById('prompt-input');
                return input.value;
            }
            return null;
        });
    }
    
    async select(options) {
        return this.show({
            title: options.title || 'اختيار',
            inputs: [{
                id: 'select-input',
                label: options.label || 'اختر:',
                type: 'select',
                options: options.options || []
            }],
            buttons: [
                { text: options.cancelText || 'إلغاء', type: 'secondary' },
                { text: options.confirmText || 'موافق', type: 'primary' }
            ]
        }).then(result => {
            if (result === 1) {
                const select = document.getElementById('select-input');
                return select.value;
            }
            return null;
        });
    }
}

// Initialize modal manager
const modalManager = new ModalManager();

// Export functions
export async function showModal(options) {
    return modalManager.show(options);
}

export async function hideModal(modalId) {
    return modalManager.hide(modalId);
}

export async function hideAllModals() {
    return modalManager.hideAll();
}

export async function showLoading(message) {
    return modalManager.showLoading(message);
}

export async function hideLoading() {
    return modalManager.hideLoading();
}

export async function confirm(options) {
    return modalManager.confirm(options);
}

export async function prompt(options) {
    return modalManager.prompt(options);
}

export async function select(options) {
    return modalManager.select(options);
}

export default modalManager;