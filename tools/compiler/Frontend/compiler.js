const API_BASE_URL = '/api/run-code';
const CSHARP_API_URL = window.CSHARP_API_URL_GLOBAL;
let codeEditorInstance;
const EXERCISES_STORAGE_KEY = 'csharp_exercises';
const COMPLETED_STORAGE_KEY = 'csharp_completed';
const CONCEPTS_STORAGE_KEY = 'csharp_concepts';
let isAdminMode = false;
let currentSelectedExerciseId = null;

const ERROR_TRANSLATIONS = {
    "CS1061": "Грешка: Типът не съдържа дефиниция за '{0}'. Проверете за малки/големи букви (напр. 'Length' вместо 'Length').",
    "CS0103": "Грешка: Името '{0}' не съществува в текущия контекст. Проверете дали променливата е декларирана.",
    "CS0117": "Грешка: '{0}' не съдържа дефиниция за '{1}'.",
    "CS1002": "Грешка: Очаква се точка и запетая (;).",
    "CS1513": "Грешка: Очаква се затваряща фигурна скоба (}).",
    "CS0029": "Грешка: Не може да се преобразува тип '{0}' в '{1}'.",
    "CS0116": "Грешка: Пространството от имена не може директно да съдържа членове като полета или методи.",
    "IndexOutOfRangeException": "Грешка: Индексът е извън границите на масива.",
    "DivideByZeroException": "Критична грешка: Опит за делене на нула!"
};

const INITIAL_CONCEPTS = [
    {
        name: "1. Алгоритъм. Свойства. Видове алгоритми",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nАлгоритъмът е точно описание на последователност от крайни стъпки (команди), които трябва да бъдат изпълнени в определен ред, за да се постигне конкретен резултат при решаването на дадена задача.\n\nСВОЙСТВА:\n- Определеност (яснота): Всяка стъпка е точно дефинирана и не позволява двусмислие.\n- Резултатност: Процесът винаги води до конкретен краен резултат.\n- Крайност: Алгоритъмът задължително завършва след изтичане на краен брой стъпки.\n- Масовост: Приложим е за решаване на цял клас от подобни задачи, а не само за една конкретна задача.\n\nВИДОВЕ:\n- Линейни (последователни)\n- Разклонени (съдържащи логически условия)\n- Циклични (с повтарящи се действия)\n\nПРИМЕР:\nАлгоритъм за намиране на средно аритметично:\n1. Вземи число А;\n2. Вземи число В;\n3. Изчисли S = A + B;\n4. Изчисли R = S / 2;\n5. Покажи R."
    },
    {
        name: "2. Блок-схеми. Елементи на блок-схема",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nГрафичен метод за описване на алгоритми, при който логическите стъпки се представят чрез стандартни геометрични фигури, свързани със стрелки.\n\nЕЛЕМЕНТИ:\n- Елипса: Обозначава НАЧАЛО или КРАЙ на алгоритъма.\n- Успоредник: Използва се за ВХОД на данни от потребителя или ИЗХОД (печат) на резултат.\n- Правоъгълник: Обозначава ПРОЦЕС (аритметично изчисление или присвояване на стойност).\n- Ромб: Обозначава РЕШЕНИЕ (проверка на условие). Има два изхода: ДА и НЕ.\n\nПРИМЕР:\n[Начало] -> [/Въведи X/] -> {X > 0?} --Да--> [Печатай 'Положително'] -> [Край]"
    },
    {
        name: "3. Циклични алгоритми. Видове",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nАлгоритми, при които определена група от действия се изпълнява многократно, докато е изпълнено (или докато се изпълни) дадено логическо условие.\n\nВИДОВЕ:\n- С предусловие (while): Условието се проверява ПРЕДИ изпълнението на тялото на цикъла.\n- С постусловие (do-while): Условието се проверява СЛЕД изпълнението. Тялото се изпълнява поне веднъж.\n- С брояч (for): Изпълнява се фиксиран брой пъти чрез контролна променлива.\n\nПРИМЕР:\nДокато (резервоарът не е пълен) -> Наливай гориво."
    },
    {
        name: "4. Структура на C# програма",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nЛогическата и синтактична организация на кода в C#, която позволява на компилатора да разбере как да стартира приложението.\n\nЕЛЕМЕНТИ:\n- namespaces: Пространства от имена за логическо групиране на код.\n- class: Основен контейнер за данни и функции.\n- Main(): Главен метод, който е входната точка на всяка C# програма.\n\nПРИМЕР:\nusing System;\nclass Program {\n  static void Main() {\n    Console.WriteLine(\"Здравей!\");\n  }\n}"
    },
    {
        name: "5. Променливи и константи",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\n- Променлива: Именувана област в паметта, която съхранява данни, които могат да се променят по време на изпълнение на програмата.\n- Константа: Стойност, която се дефинира веднъж и остава фиксирана (непроменима) през целия цикъл на програмата.\n\nПРИМЕР:\nint count = 10; // Променлива\ncount = 20; // Позволено\nconst double TaxRate = 0.20; // Константа\n// TaxRate = 0.25; // ГРЕШКА!"
    },
    {
        name: "6. Примитивни типове данни",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nВградените базови типове в езика, които определят какъв вид информация ще се съхранява и какви операции могат да се извършват с нея.\n\nВИДОВЕ:\n- int: Цели числа (напр. 5, -10).\n- double: Числа с плаваща запетая (напр. 3.14).\n- bool: Логически стойности (true или false).\n- char: Единичен символ (напр. 'A').\n- string: Текстова последователност (напр. \"Hello\").\n\nПРИМЕР:\nint age = 16;\ndouble price = 19.99;\nbool isCorrect = true;"
    },
    {
        name: "7. Видове оператори. Оператори за съкратен запис",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nСпециални символи, които извършват изчисления или логически проверки върху операнди (променливи или стойности).\n\nВИДОВЕ:\n- Аритметични: +, -, *, /, % (остатък).\n- Сравнение: ==, !=, >, <, >=, <=.\n- Логически: && (И), || (ИЛИ), ! (НЕ).\n- Съкратен запис: Обединяват операция и присвояване.\n\nПРИМЕР:\nx += 5; // x = x + 5\ny *= 2; // y = y * 2\ni++;    // i = i + 1"
    },
    {
        name: "8. Условни конструкции",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nКоманди, които позволяват на програмата да разклонява своя път на изпълнение в зависимост от това дали дадено логическо условие е истина или лъжа.\n\nВИДОВЕ:\n- if: Единична проверка.\n- if-else: Двупосочно разклонение.\n- switch: Избор между много конкретни стойности.\n\nПРИМЕР:\nif (age >= 18) {\n  Console.WriteLine(\"Пълнолетен\");\n}\nelse {\n  Console.WriteLine(\"Непълнолетен\");\n}"
    },
    {
        name: "9. Цикли (for, while)",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nПрограмни структури за многократно изпълнение на един и същи блок от код, което спестява време и предотвратява дублирането на команди.\n\nПРИМЕР:\nfor (int i = 0; i < 10; i++) {\n  Console.WriteLine(i);\n}\n\nwhile (energy > 0) {\n  energy--;\n}"
    },
    {
        name: "10. Структури от данни",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nНачин за логическо организиране и съхранение на данни в компютърната памет, така че те да могат да бъдат достъпвани и обработвани ефективно.\n\nВИДОВЕ:\n- Масиви (фиксиран размер).\n- List (динамичен списък).\n- Dictionary (ключ-стойност).\n- Stack (LIFO) и Queue (FIFO).\n\nПРИМЕР:\nСписък с контакти в телефон, където всяко име е свързано с номер."
    },
    {
        name: "11. Масив",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nКолекция от фиксиран брой елементи от един и същи тип, които са подредени последователно и са достъпни чрез общо име и индекс (позиция).\n\nХАРАКТЕРИСТИКИ:\n- Индексацията започва от 0.\n- Размерът се задава при създаване и не се променя.\n\nПРИМЕР:\nint[] scores = new int[3] { 90, 85, 100 };\nint firstScore = scores[0]; // 90"
    },
    {
        name: "12. Сума и произведение на елементите на масив",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nКласически алгоритъм за акумулиране на стойности чрез обхождане на всички елементи в структура от данни.\n\nАЛГОРИТЪМ:\n1. Създай променлива за резултат (0 за сума, 1 за произведение);\n2. Премини през всеки елемент;\n3. Добави/Умножи го към резултата.\n\nПРИМЕР:\nint sum = 0;\nforeach(int n in nums) sum += n;\n\nlong prod = 1;\nforeach(int n in nums) prod *= n;"
    },
    {
        name: "13. Търсене в масив. Min и Max",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nПроцес на намиране на най-малката или най-голямата стойност в списък чрез последователно сравняване на текущия най-добър кандидат с останалите елементи.\n\nПРИМЕР:\nint max = numbers[0];\nforeach(int n in numbers) {\n  if (n > max) max = n;\n}"
    },
    {
        name: "14. BubbleSort (Сортиране чрез мехурчето)",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nАлгоритъм за подреждане на елементи (напр. от най-малко към най-голямо), при който съседни елементи се сравняват и разменят местата си, ако не са в правилния ред.\n\nЛОГИКА:\nПри всяко преминаване най-големият останал елемент 'изплува' като мехурче към правилната си позиция в края.\n\nПРИМЕР:\nАко имаме [3, 1], сравняваме ги и ги разменяме, за да получим [1, 3]."
    },
    {
        name: "15. LinearSearch (Линейно търсене)",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nМетод за намиране на позицията (индекса) на конкретен елемент в масив чрез последователна проверка на всеки елемент един по един от началото до края.\n\nПРИМЕР:\nТърсим числото 7 в [1, 5, 7, 2]. Проверяваме 1 (не), 5 (не), 7 (ДА - индекс 2)."
    },
    {
        name: "16. Рекурсия",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nПрограмен механизъм, при който една функция (метод) извиква сама себе си, за да реши подзадача на основния проблем. Всяка рекурсия трябва да има 'дъно' (условие за спиране).\n\nПРИМЕР:\nstatic int Factorial(int n) {\n  if (n == 0) return 1; // Дъно\n  return n * Factorial(n - 1); // Рекурсивно извикване\n}"
    },
    {
        name: "17. Библиотеки",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nКолекции от предварително написан и тестван код, методи и класове, които програмистите могат да използват наготово, за да не пишат всичко от нулата.\n\nПРИМЕР:\nusing System.Math; // Библиотека за математика\ndouble root = Math.Sqrt(16); // 4"
    },
    {
        name: "18. Модификатори за достъп",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nКлючови думи, които контролират видимостта и достъпността на класовете и техните членове за останалата част от програмния код.\n\nВИДОВЕ:\n- public: Достъпно отвсякъде.\n- private: Достъпно само в рамките на текущия клас.\n\nПРИМЕР:\npublic string Name; // Всеки може да го види\nprivate string _password; // Скрито"
    },
    {
        name: "19. Методи",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nОбособен и именуван блок от код (подпрограма), който извършва специфично действие и може да приема входни данни (параметри) и да връща резултат.\n\nПРИМЕР:\nstatic void Greet() {\n  Console.WriteLine(\"Здравейте!\");\n}"
    },
    {
        name: "20. Класове",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nШаблон или чертеж за създаване на обекти. Дефинира какви характеристики (данни) и поведения (методи) ще притежават обектите от този тип.\n\nПРИМЕР:\nclass Car {\n  public string Color;\n  public int Speed;\n}"
    },
    {
        name: "21. Обекти",
        desc: "📌 ОПРЕДЕЛЕНИЕ:\nКонкретен екземпляр (реализация), създаден по шаблона на даден клас, който съществува в оперативната памет със свои собствени стойности.\n\nПРИМЕР:\nCar myCar = new Car();\nmyCar.Color = \"Red\";"
    }
];

const INITIAL_EXERCISES = {
    "1": { condition: "Намерете по-голямото число между 15 и 7.", starter_code: "int a = 15;\nint b = 7;\nint maxNum = Math.Max(a, b);\nConsole.WriteLine(maxNum);", expected_output: "15" },
    "2": { condition: "Пребройте колко пъти числото 5 се среща в масива.", starter_code: "int[] numbers = { 2, 5, 8, 5, 1, 5 };\nint count = 0;\nfor (int i = 0; i < numbers.Length; i++)\n{\n    if (numbers[i] == 5) count++;\n}\nConsole.WriteLine(count);", expected_output: "3" },
    "3": { condition: "Дефинирайте метод PrintInfo и го извикайте.", starter_code: "public static void PrintInfo()\n{\n    Console.WriteLine(\"Аз съм метод.\");\n}\nPrintInfo();", expected_output: "Аз съм метод." },
    "4": { condition: "Изчислете сбора на 5 и 8 в метод.", starter_code: "public static void CalculateSum()\n{\n    int sum = 5 + 8;\n    Console.WriteLine(sum);\n}\nCalculateSum();", expected_output: "13" },
    "5": { condition: "Метод с параметър име.", starter_code: "public static void Greeting(string name)\n{\n    Console.WriteLine(\"Здравей, \" + name + \"!\");\n}\nGreeting(\"Иван\");", expected_output: "Здравей, Иван!" },
    "6": { condition: "Метод Multiply с return.", starter_code: "public static int Multiply(int a, int b)\n{\n    return a * b;\n}\nConsole.WriteLine(Multiply(6, 7));", expected_output: "42" },
    "7": { condition: "Намиране сумата на всички числа в масив.", starter_code: "int[] arr = { 1, 2, 3, 4, 5 };\nint sum = 0;\nfor(int i = 0; i < arr.Length; i++)\n{\n    sum += arr[i];\n}\nConsole.WriteLine(sum);", expected_output: "15" },
    "8": { condition: "Намиране произведение на числата в масив.", starter_code: "int[] arr = { 2, 3, 4 };\nint prod = 1;\nfor(int i = 0; i < arr.Length; i++)\n{\n    prod *= arr[i];\n}\nConsole.WriteLine(prod);", expected_output: "24" },
    "9": { condition: "Намиране на максимален елемент в масив.", starter_code: "int[] arr = { 12, 45, 2, 67, 33 };\nint max = arr[0];\nfor(int i = 1; i < arr.Length; i++)\n{\n    if(arr[i] > max) max = arr[i];\n}\nConsole.WriteLine(max);", expected_output: "67" },
    "10": { condition: "Намиране на минимален елемент в масив.", starter_code: "int[] arr = { 12, 45, 2, 67, 33 };\nint min = arr[0];\nfor(int i = 1; i < arr.Length; i++)\n{\n    if(arr[i] < min) min = arr[i];\n}\nConsole.WriteLine(min);", expected_output: "2" },
    "11": { condition: "Линейно търсене на индекс на число.", starter_code: "int[] arr = { 1, 4, 7, 2 };\nint target = 7;\nint index = -1;\nfor(int i = 0; i < arr.Length; i++)\n{\n    if(arr[i] == target) { index = i; break; }\n}\nConsole.WriteLine(index);", expected_output: "2" },
    "12": { condition: "Сортиране на масив с Bubble Sort.", starter_code: "int[] arr = { 3, 1, 2 };\nfor(int i = 0; i < arr.Length - 1; i++)\n{\n    for(int j = 0; j < arr.Length - i - 1; j++)\n    {\n        if(arr[j] > arr[j+1])\n        {\n            int temp = arr[j];\n            arr[j] = arr[j+1];\n            arr[j+1] = temp;\n        }\n    }\n}\nConsole.WriteLine(string.Join(\",\", arr));", expected_output: "1,2,3" },
    "13": { condition: "Изчисляване на факториел чрез рекурсия.", starter_code: "public static int Factorial(int n)\n{\n    if(n <= 1) return 1;\n    return n * Factorial(n - 1);\n}\nConsole.WriteLine(Factorial(4));", expected_output: "24" },
    "14": { condition: "Рекурсивно събиране на числа от 1 до n.", starter_code: "public static int Sum(int n)\n{\n    if(n == 1) return 1;\n    return n + Sum(n - 1);\n}\nConsole.WriteLine(Sum(5));", expected_output: "15" },
    "15": { condition: "Създаване на клас Car и достъпване на поле.", starter_code: "public class Car \n{\n    public string Brand = \"Tesla\";\n}\nCar myCar = new Car();\nConsole.WriteLine(myCar.Brand);", expected_output: "Tesla" },
    "16": { condition: "Клас с метод за площ на правоъгълник.", starter_code: "public class Rect\n{\n    public int Calc(int a, int b) { return a * b; }\n}\nRect r = new Rect();\nConsole.WriteLine(r.Calc(5, 4));", expected_output: "20" },
    "17": { condition: "Демонстрация на енкапсулация (private поле).", starter_code: "public class User\n{\n    private string name = \"Admin\";\n    public string GetName() { return name; }\n}\nUser u = new User();\nConsole.WriteLine(u.GetName());", expected_output: "Admin" },
    "18": { condition: "Използване на тернарен оператор за четност.", starter_code: "int n = 10;\nstring res = (n % 2 == 0) ? \"Even\" : \"Odd\";\nConsole.WriteLine(res);", expected_output: "Even" },
    "19": { condition: "Обединяване на елементи от масив в един низ.", starter_code: "string[] words = { \"C#\", \"is\", \"cool\" };\nConsole.WriteLine(string.Join(\" \", words));", expected_output: "C# is cool" },
    "20": { condition: "Обратно броене с цикъл while.", starter_code: "int i = 3;\nwhile(i > 0)\n{\n    Console.Write(i);\n    i--;\n}", expected_output: "321" },
    "21": { condition: "Корен квадратен с библиотеката Math.", starter_code: "double n = 16;\nConsole.WriteLine(Math.Sqrt(n));", expected_output: "4" },
    "22": { condition: "Използване на конструктор в клас.", starter_code: "public class Dog\n{\n    public string Name;\n    public Dog(string n) { Name = n; }\n}\nDog d = new Dog(\"Sharo\");\nConsole.WriteLine(d.Name);", expected_output: "Sharo" },
    "23": { condition: "Търсене на символ в стринг.", starter_code: "string text = \"Hello\";\nchar search = 'e';\nbool exists = false;\nforeach(char c in text)\n{\n    if(c == search) exists = true;\n}\nConsole.WriteLine(exists);", expected_output: "True" },
    "24": { condition: "Оператор за съкратено умножение.", starter_code: "int x = 5;\nx *= 10;\nConsole.WriteLine(x);", expected_output: "50" },
    "25": { condition: "Пресмятане на средна стойност на масив.", starter_code: "int[] nums = { 2, 4, 6 };\nint sum = 0;\nforeach(int n in nums) sum += n;\nConsole.WriteLine(sum / nums.Length);", expected_output: "4" },
    "26": { condition: "Рекурсивно принтиране на числа в обратен ред.", starter_code: "public static void Count(int n)\n{\n    if(n == 0) return;\n    Console.Write(n);\n    Count(n - 1);\n}\nCount(3);", expected_output: "321" },
    "27": { condition: "Проверка за високосна година с логически оператори.", starter_code: "int year = 2024;\nbool isLeap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);\nConsole.WriteLine(isLeap);", expected_output: "True" },
    "28": { condition: "Използване на Switch конструкция за дни от седмицата.", starter_code: "int day = 1;\nswitch(day)\n{\n    case 1: Console.WriteLine(\"Monday\"); break;\n    default: Console.WriteLine(\"Other\"); break;\n}", expected_output: "Monday" },
    "29": { condition: "Намиране на втория по големина елемент в масив.", starter_code: "int[] arr = { 10, 5, 20, 15 };\nArray.Sort(arr);\nConsole.WriteLine(arr[arr.Length - 2]);", expected_output: "15" },
    "30": { condition: "Метод, който връща масив в обратен ред.", starter_code: "int[] arr = { 1, 2, 3 };\nArray.Reverse(arr);\nConsole.WriteLine(string.Join(\"\", arr));", expected_output: "321" },
    "31": { condition: "Работа с тип char - превръщане на малка буква в главна.", starter_code: "char letter = 'a';\nConsole.WriteLine(char.ToUpper(letter));", expected_output: "A" },
    "32": { condition: "Клас Book с автоматични свойства.", starter_code: "public class Book\n{\n    public string Title { get; set; } = \"C# Basics\";\n}\nBook b = new Book();\nConsole.WriteLine(b.Title);", expected_output: "C# Basics" },
    "33": { condition: "Проверка дали низ е палиндром (чрез обръщане).", starter_code: "string word = \"radar\";\nchar[] arr = word.ToCharArray();\nArray.Reverse(arr);\nstring rev = new string(arr);\nConsole.WriteLine(word == rev);", expected_output: "True" },
    "34": { condition: "Използване на оператор % за намиране на остатък.", starter_code: "int a = 11;\nint b = 3;\nConsole.WriteLine(a % b);", expected_output: "2" },
    "35": { condition: "Метод със стойност по подразбиране (Default Parameter).", starter_code: "public static void Show(string msg = \"Hi\")\n{\n    Console.WriteLine(msg);\n}\nShow();", expected_output: "Hi" },
    "36": { condition: "Създаване на два обекта от един и същи клас.", starter_code: "public class Point { public int X; }\nPoint p1 = new Point { X = 10 };\nPoint p2 = new Point { X = 20 };\nConsole.WriteLine(p1.X + p2.X);", expected_output: "30" }
};

function translateErrorMessage(rawError) {
    let translated = rawError;
    for (const [code, message] of Object.entries(ERROR_TRANSLATIONS)) {
        if (rawError.includes(code)) {
            translated = `[${code}] ${message}\n\nОригинална грешка:\n${rawError}`;
            break;
        }
    }
    return translated;
}

function getExercises() {
    const stored = localStorage.getItem(EXERCISES_STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (Object.keys(parsed).length >= Object.keys(INITIAL_EXERCISES).length) return parsed;
    }
    saveExercises(INITIAL_EXERCISES);
    return INITIAL_EXERCISES;
}

function saveExercises(exercisesObj) {
    localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(exercisesObj));
}

function getCompletedExercises() {
    const stored = localStorage.getItem(COMPLETED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function addCompletedExercise(exerciseId) {
    let completed = getCompletedExercises();
    if (!completed.includes(exerciseId)) {
        completed.push(exerciseId);
        localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completed));
    }
}

function getConcepts() {
    const stored = localStorage.getItem(CONCEPTS_STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.length >= INITIAL_CONCEPTS.length) return parsed;
    }
    localStorage.setItem(CONCEPTS_STORAGE_KEY, JSON.stringify(INITIAL_CONCEPTS));
    return INITIAL_CONCEPTS;
}

function populateConceptsDropdown() {
    const dropdown = document.getElementById('concepts-dropdown');
    if (!dropdown) return;
    const concepts = getConcepts();
    dropdown.innerHTML = '';
    concepts.forEach(c => {
        const a = document.createElement('a');
        a.href = "#";
        a.textContent = c.name;
        a.onclick = (e) => {
            e.preventDefault();
            const model = codeEditorInstance.getModel();
            monaco.editor.setModelLanguage(model, 'plaintext');
            codeEditorInstance.setValue(c.desc);
            document.getElementById('code-editor-container').classList.add('concept-view');
            dropdown.classList.remove('show');
        };
        dropdown.appendChild(a);
    });
}

function toggleConceptsDropdown() {
    const dropdown = document.getElementById("concepts-dropdown");
    if (dropdown) dropdown.classList.toggle("show");
}

function openModal() {
    if (addExerciseModal) addExerciseModal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id) || addExerciseModal;
    if (modal) modal.style.display = 'none';
    if (newExerciseForm) newExerciseForm.reset();
}

function setAdminMode(enabled) {
    isAdminMode = enabled;
    if (!lockBtn || !pinInput || !adminActions) return;

    if (enabled) {
        lockBtn.textContent = '🔓';
        lockBtn.onclick = logoutAdmin;
        pinInput.style.display = 'none';
        adminActions.style.display = 'flex';
    } else {
        lockBtn.textContent = '🔒';
        lockBtn.onclick = checkPin;
        pinInput.style.display = 'block';
        adminActions.style.display = 'none';
    }

    if (exerciseSelect) exerciseSelect.style.display = enabled ? 'none' : 'block';
    if (exerciseListAdmin) exerciseListAdmin.style.display = enabled ? 'block' : 'none';

    populateExerciseSelect();

    if (codeEditorInstance) {
        if (!currentSelectedExerciseId && exerciseSelect && exerciseSelect.options.length > 0) {
            currentSelectedExerciseId = exerciseSelect.options[0].value;
        }
        loadExercise(currentSelectedExerciseId);
    }
}

async function checkPin() {
    const pin = pinInput.value;
    if (pin.length === 0) return;
    try {
        const response = await fetch('/api/check-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pin })
        });
        const data = await response.json();
        if (response.ok && data.success) setAdminMode(true);
        else { alert("Грешен ПИН."); pinInput.value = ''; }
    } catch (error) { alert('Грешка при комуникация.'); }
}

function logoutAdmin() {
    if (confirm("Изход?")) setAdminMode(false);
}

function removeExercise(exerciseId) {
    event.stopPropagation();
    const exercisesData = getExercises();
    if (!confirm(`Изтриване?`)) return;
    delete exercisesData[exerciseId];
    saveExercises(exercisesData);
    populateExerciseSelect();
}

function populateExerciseSelect() {
    if (!exerciseSelect || !exerciseListAdmin) return;
    const currentExercises = getExercises();
    const completedIds = getCompletedExercises();
    exerciseSelect.innerHTML = '';
    exerciseListAdmin.innerHTML = '';

    const sortedIds = Object.keys(currentExercises).sort((a, b) => parseInt(a) - parseInt(b));

    for (const id of sortedIds) {
        const ex = currentExercises[id];
        const isCompleted = completedIds.includes(id);
        const text = `Пример ${id}. ${ex.condition.substring(0, 50)}...`;

        const option = document.createElement('option');
        option.value = id;
        option.textContent = isCompleted ? `✅ ${text}` : text;
        exerciseSelect.appendChild(option);

        const row = document.createElement('div');
        row.classList.add('admin-exercise-row');
        row.innerHTML = `<span>${isCompleted ? '✅ ' : ''}${text}</span> <button onclick="removeExercise('${id}')">❌</button>`;
        row.onclick = () => { currentSelectedExerciseId = id; loadExercise(id); };
        exerciseListAdmin.appendChild(row);
    }
}

function handleNewExercise(event) {
    event.preventDefault();
    const cond = document.getElementById('new-condition').value.trim();
    const out = document.getElementById('new-expected-output').value.trim();
    if (!cond || !out) return;
    const current = getExercises();
    const nid = Date.now().toString();
    current[nid] = {
        condition: cond,
        starter_code: document.getElementById('new-starter-code').value || "// Код",
        expected_output: out,
        solution_code: document.getElementById('new-solution-code').value
    };
    saveExercises(current);
    populateExerciseSelect();
    closeModal();
}

function initializeMonaco() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        codeEditorInstance = monaco.editor.create(document.getElementById('code-editor-container'), {
            value: "// Зареждане...",
            language: 'csharp',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 16
        });

        const currentExercises = getExercises();
        const sortedIds = Object.keys(currentExercises).sort((a, b) => parseInt(a) - parseInt(b));
        if (sortedIds.length > 0) loadExercise(sortedIds[0]);
    });
}

function loadExercise(id) {
    if (!id || !codeEditorInstance) return;
    currentSelectedExerciseId = id;
    const ex = getExercises()[id];
    if (ex) {
        conditionDiv.innerHTML = `<p>${ex.condition}</p>`;
        const model = codeEditorInstance.getModel();
        monaco.editor.setModelLanguage(model, 'csharp');
        codeEditorInstance.setValue(ex.starter_code);
        outputWindow.value = "💻 Готово.";
    }
}

async function runCode() {
    if (!codeEditorInstance || !currentSelectedExerciseId) return;
    const userCode = codeEditorInstance.getValue();
    runButton.disabled = true;
    outputWindow.value = "⏳ Изпълнение...";

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: userCode, input: "" })
        });
        const data = await response.json();
        const ex = getExercises()[currentSelectedExerciseId];

        if (data.isSuccess) {
            if (data.output.trim() === ex.expected_output.trim()) {
                outputWindow.value = `✅ УСПЕХ!\n\n${data.output}`;
                addCompletedExercise(currentSelectedExerciseId);
                populateExerciseSelect();
            } else {
                outputWindow.value = `❌ ГРЕШЕН ИЗХОД\nОчакван: ${ex.expected_output}\nВаш: ${data.output}`;
            }
        } else {
            outputWindow.value = `⚠️ ГРЕШКА ПРИ КОМПИЛАЦИЯ\n${translateErrorMessage(data.output)}`;
        }
    } catch (e) { outputWindow.value = "🚫 СЪРВЪРНА ГРЕШКА"; }
    finally { runButton.disabled = false; }
}

document.addEventListener('DOMContentLoaded', () => {
    outputWindow = document.getElementById('output-window');
    conditionDiv = document.getElementById('exercise-condition');
    exerciseSelect = document.getElementById('exercise-select');
    exerciseListAdmin = document.getElementById('exercise-list-admin');
    runButton = document.getElementById('run-button');
    addExerciseModal = document.getElementById('add-exercise-modal');
    newExerciseForm = document.getElementById('new-exercise-form');
    adminActions = document.getElementById('admin-actions');
    pinInput = document.getElementById('pin-input');
    lockBtn = document.getElementById('lock-btn');

    populateExerciseSelect();
    populateConceptsDropdown();
    initializeMonaco();

    exerciseSelect.onchange = (e) => loadExercise(e.target.value);
    document.getElementById('add-exercise-btn').onclick = openModal;
    newExerciseForm.onsubmit = handleNewExercise;
    pinInput.onkeypress = (e) => { if (e.key === 'Enter') checkPin(); };
    lockBtn.onclick = checkPin;

    setAdminMode(false);

    window.onclick = function (event) {
        const dropdown = document.getElementById("concepts-dropdown");
        const btn = document.getElementById("concepts-btn");
        if (dropdown && dropdown.classList.contains('show')) {
            if (!dropdown.contains(event.target) && event.target !== btn) dropdown.classList.remove('show');
        }
    };

    window.closeModal = closeModal;
    window.runCode = runCode;
    window.toggleConceptsDropdown = toggleConceptsDropdown;
});