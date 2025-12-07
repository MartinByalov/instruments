// dashboard.js (Финална версия - Без автоматично пренасочване)

// 🚨 ВАЖНО: TEACHER_PIN_GLOBAL трябва да бъде инжектиран от server.js
// Тъй като инжектирането на / (index.html) липсва в server.js,
// използваме директната стойност, която е зададена в .env (3214)
const CORRECT_PIN = window.TEACHER_PIN_GLOBAL || "3214"; 

document.addEventListener('DOMContentLoaded', () => {
    const compilerCard = document.getElementById('compiler-card');
    const pinInput = document.getElementById('compiler-pin');
    const lockMessage = document.getElementById('lock-message');

    // 1. Първоначално заключваме картата
    compilerCard.classList.add('compiler-locked');
    // Деактивираме връзката, докато е заключена
    compilerCard.addEventListener('click', preventDefaultLink);
    
    function preventDefaultLink(e) {
        if (compilerCard.classList.contains('compiler-locked')) {
            e.preventDefault();
        }
    }

    // 🎯 НОВА ЛОГИКА: Проверяваме при въвеждане на всеки символ
    pinInput.addEventListener('input', () => {
        const enteredPin = pinInput.value;

        // Проверяваме дали са въведени 4 символа и дали съвпадат
        if (enteredPin.length === 4) {
            if (enteredPin === CORRECT_PIN) {
                // УСПЕШНО ОТКЛЮЧВАНЕ
                unlockCompiler();
            } else {
                // ГРЕШЕН PIN
                lockMessage.textContent = 'Грешен PIN!';
                lockMessage.style.color = 'red';
                // ✅ Нулираме полето при грешка за по-добра обратна връзка
                pinInput.value = ''; 
            }
        } else {
             // Изчистваме съобщението, ако потребителят редактира PIN-а
             lockMessage.textContent = '';
        }
    });

    function unlockCompiler() {
        // Визуално отключване
        compilerCard.classList.remove('compiler-locked');
        compilerCard.classList.add('compiler-unlocked');
        lockMessage.textContent = 'Отключено! Кликнете, за да влезете.';
        lockMessage.style.color = 'green';
        
        // Премахваме event listener-а, за да може връзката да работи
        // (Сега кликването ще пренасочи потребителя)
        compilerCard.removeEventListener('click', preventDefaultLink);
        
        // ❌ ПРЕМАХНАТО: Няма автоматично пренасочване
        /*
        setTimeout(() => {
            window.location.href = compilerCard.href;
        }, 500);
        */
    }
});