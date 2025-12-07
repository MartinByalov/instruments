const CORRECT_PIN = window.TEACHER_PIN_GLOBAL || "3214"; 

document.addEventListener('DOMContentLoaded', () => {
    const compilerCard = document.getElementById('compiler-card');
    const pinInput = document.getElementById('compiler-pin');
    const lockMessage = document.getElementById('lock-message');

    compilerCard.classList.add('compiler-locked');
    compilerCard.addEventListener('click', preventDefaultLink);
    
    function preventDefaultLink(e) {
        if (compilerCard.classList.contains('compiler-locked')) {
            e.preventDefault();
        }
    }

    pinInput.addEventListener('input', () => {
        const enteredPin = pinInput.value;

        if (enteredPin.length === 4) {
            if (enteredPin === CORRECT_PIN) {
                unlockCompiler();
            } else {
                lockMessage.textContent = 'Грешен PIN!';
                lockMessage.style.color = 'red';
                pinInput.value = ''; 
            }
        } else {
             lockMessage.textContent = '';
        }
    });

    function unlockCompiler() {
        compilerCard.classList.remove('compiler-locked');
        compilerCard.classList.add('compiler-unlocked');
        lockMessage.textContent = 'Отключено! Кликнете, за да влезете.';
        lockMessage.style.color = 'green';
        compilerCard.removeEventListener('click', preventDefaultLink);
    }
});
