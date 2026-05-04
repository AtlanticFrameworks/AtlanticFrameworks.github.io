/**
 * ModalService - Handles opening and closing of modals
 */
const ModalService = {
    open(id) {
        const modal = document.getElementById('modal-' + id);
        if (modal) {
            modal.classList.add('active');
            console.log(`[ModalService] Opened modal: ${id}`);
        } else {
            console.warn(`[ModalService] Modal not found: modal-${id}`);
        }
    },

    close(id) {
        const modal = document.getElementById('modal-' + id);
        if (modal) {
            modal.classList.remove('active');
            console.log(`[ModalService] Closed modal: ${id}`);
        }
    }
};

window.ModalService = ModalService;
