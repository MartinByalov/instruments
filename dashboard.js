document.addEventListener('DOMContentLoaded', () => {
    const TEACHER_PIN = (window.TEACHER_PIN_GLOBAL || '').trim();
    const compilerCard = document.getElementById('compiler-card');
    const pinInput = document.getElementById('compiler-pin');
    const lockMessage = document.getElementById('lock-message');
    if (!compilerCard || !pinInput || !lockMessage) return;
    
    compilerCard.classList.add('compiler-locked');
    compilerCard.addEventListener('click', preventDefaultLink);
    
    if (!TEACHER_PIN) {
        lockMessage.textContent = '🔓 Отключено по подразбиране (PIN не е настроен).';
        lockMessage.style.color = '#333';
        pinInput.style.display = 'none';
        compilerCard.classList.remove('compiler-locked');
        return;
    }
    pinInput.addEventListener('input', () => {
        const enteredPin = pinInput.value;
        if (enteredPin.length === 4) {
            validatePinOnServer(enteredPin);
        } else {
            if (lockMessage.textContent === 'Грешен PIN!') {
                lockMessage.textContent = '';
            }
        }
    });
    async function validatePinOnServer(pin) {
        try {
            const response = await fetch('/api/auth/pin-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pin: pin })
            });
            const data = await response.json();
            if (data.success) {
                unlockCompiler();
            } else {
                lockMessage.textContent = 'Грешен PIN!';
                lockMessage.style.color = 'red';
                setTimeout(() => {
                    pinInput.value = ''; 
                    lockMessage.textContent = '';
                }, 500);
            }
        } catch (error) {
            console.error("Грешка при комуникация със сървъра:", error);
            lockMessage.textContent = 'Грешка при свързване.';
            lockMessage.style.color = 'red';
        }
    }
    
    function preventDefaultLink(e) {
        if (compilerCard.classList.contains('compiler-locked')) {
            e.preventDefault(); 
        }
    }
    function unlockCompiler() {
        compilerCard.classList.remove('compiler-locked');
        compilerCard.classList.add('compiler-unlocked');
        lockMessage.textContent = 'Отключено! Кликнете, за да влезете.';
        lockMessage.style.color = 'green';
        compilerCard.removeEventListener('click', preventDefaultLink);
        pinInput.style.display = 'none'; 
    }
});
