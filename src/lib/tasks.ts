// Банк заданий тренажёра. Чтобы добавить задание — скопируйте любую запись,
// поменяйте id (уникальный), предмет, тему, текст, ответы и разбор.
// answers — все допустимые варианты записи ответа (регистр и пробелы не важны).

export type SubjectId = "rus" | "math" | "hist" | "soc" | "bio" | "chem" | "phys";
export type Task = { id: string; subj: SubjectId; topic: string; q: string; answers: string[]; exp: string };

export const TASKS: Task[] = [
  // История
  {id:"h1", subj:"hist", topic:"Древняя Русь", q:"В каком году произошло Крещение Руси?", answers:["988","988 г","988 год"],
   exp:"Князь Владимир Святославич принял христианство и крестил Киев в 988 году. Эта дата — одна из опорных в кодификаторе, с неё начинается древнерусский христианский период."},
  {id:"h2", subj:"hist", topic:"Борьба с Ордой", q:"Укажите год Куликовской битвы.", answers:["1380"],
   exp:"8 сентября 1380 года войско Дмитрия Донского разбило ордынцев Мамая на Куликовом поле. Зависимость от Орды при этом сохранилась — окончательно её сняло стояние на Угре 1480 года."},
  {id:"h3", subj:"hist", topic:"Московское государство", q:"В каком году был принят Судебник Ивана III?", answers:["1497"],
   exp:"Судебник 1497 года — первый общерусский свод законов. Он ввёл Юрьев день: переход крестьян только за неделю до и неделю после 26 ноября, с уплатой пожилого."},
  {id:"h4", subj:"hist", topic:"Великие реформы", q:"Укажите год отмены крепостного права в России.", answers:["1861"],
   exp:"19 февраля 1861 года Александр II подписал Манифест об отмене крепостного права. Крестьяне получили личную свободу, но землю выкупали — отсюда временнообязанное состояние и выкупные платежи."},
  {id:"h5", subj:"hist", topic:"Древняя Русь", q:"Как назывался свод законов, составление которого началось при Ярославе Мудром? (два слова)", answers:["русская правда"],
   exp:"«Русская Правда» — первый письменный свод древнерусского права. Начата при Ярославе Мудром, дополнялась его сыновьями (Правда Ярославичей) и Владимиром Мономахом."},
  {id:"h6", subj:"hist", topic:"Современная Россия", q:"В каком году была принята действующая Конституция Российской Федерации?", answers:["1993"],
   exp:"Конституция принята на всенародном голосовании 12 декабря 1993 года. Поправки 2020 года её не заменили — это та же Конституция в новой редакции."},

  // Обществознание
  {id:"s1", subj:"soc", topic:"Общество", q:"Как называется тип общества, в котором главным ресурсом становится информация, а в экономике преобладает сфера услуг?", answers:["постиндустриальное","информационное","постиндустриальное общество","информационное общество"],
   exp:"Три типа общества в кодификаторе: традиционное (аграрное), индустриальное (промышленность, массовое производство) и постиндустриальное, оно же информационное — услуги, знания, компьютерные технологии."},
  {id:"s2", subj:"soc", topic:"Политика", q:"Назовите высший орган исполнительной власти в Российской Федерации. (два слова)", answers:["правительство рф","правительство россии","правительство российской федерации"],
   exp:"Правительство РФ возглавляет систему исполнительной власти. Не путайте: законодательная власть — Федеральное Собрание, судебная — суды, а Президент в эту триаду формально не входит."},
  {id:"s3", subj:"soc", topic:"Право", q:"С какого возраста по общему правилу наступает полная гражданская дееспособность в РФ?", answers:["18","18 лет","с 18"],
   exp:"По статье 21 ГК РФ полная дееспособность наступает в 18 лет. Исключения — вступление в брак до совершеннолетия и эмансипация с 16 лет."},
  {id:"s4", subj:"soc", topic:"Право", q:"Как называется способность человека своими действиями приобретать и осуществлять права и обязанности?", answers:["дееспособность"],
   exp:"Дееспособность — способность действовать самому. Правоспособность же возникает с рождения и есть у каждого, включая младенца: это способность иметь права."},
  {id:"s5", subj:"soc", topic:"Политика", q:"Назовите форму правления, при которой власть главы государства передаётся по наследству.", answers:["монархия"],
   exp:"Форма правления отвечает на вопрос, кто и как получает власть: монархия (по наследству) или республика (выборы). Не путайте с формой государственного устройства — федерация, унитарное государство."},

  // Биология
  {id:"b1", subj:"bio", topic:"Клетка", q:"Какой органоид клетки отвечает за синтез белка?", answers:["рибосома","рибосомы"],
   exp:"Рибосома собирает белок из аминокислот по матрице иРНК — это трансляция. Рибосомы есть и в цитоплазме, и на шероховатой ЭПС, и внутри митохондрий и хлоропластов."},
  {id:"b2", subj:"bio", topic:"Генетика", q:"Сколько хромосом содержится в соматической клетке человека?", answers:["46"],
   exp:"Диплоидный набор человека 2n = 46: 44 аутосомы и 2 половые хромосомы. В гаметах после мейоза остаётся гаплоидный набор — 23 хромосомы."},
  {id:"b3", subj:"bio", topic:"Обмен веществ", q:"Как называется процесс образования органических веществ из углекислого газа и воды на свету?", answers:["фотосинтез"],
   exp:"Фотосинтез идёт в хлоропластах: световая фаза на мембранах тилакоидов даёт АТФ и НАДФ·Н, темновая фаза в строме связывает CO₂ в глюкозу (цикл Кальвина)."},
  {id:"b4", subj:"bio", topic:"Ботаника", q:"Какой органоид клетки называют «энергетической станцией» — в нём идёт окисление органических веществ с образованием АТФ?", answers:["митохондрия","митохондрии"],
   exp:"Митохондрия проводит кислородный этап энергетического обмена. На кристах работает дыхательная цепь, и один моль глюкозы даёт в сумме 38 молекул АТФ."},
  {id:"b5", subj:"bio", topic:"Человек", q:"Сколько камер в сердце человека?", answers:["4","четыре","4 камеры"],
   exp:"Два предсердия и два желудочка. Правая половина гонит венозную кровь в малый круг, левая — артериальную в большой; стенка левого желудочка самая толстая."},

  // Химия
  {id:"c1", subj:"chem", topic:"Строение атома", q:"Сколько протонов содержится в атоме азота?", answers:["7"],
   exp:"Число протонов равно порядковому номеру элемента. Азот стоит седьмым, значит 7 протонов и, в нейтральном атоме, 7 электронов."},
  {id:"c2", subj:"chem", topic:"Классы веществ", q:"Запишите формулу серной кислоты.", answers:["h2so4"],
   exp:"H₂SO₄ — двухосновная кислородсодержащая кислота. Не путайте с сернистой H₂SO₃ и сероводородной H₂S."},
  {id:"c3", subj:"chem", topic:"Степень окисления", q:"Определите степень окисления серы в H₂SO₄. (со знаком, например +2)", answers:["+6","6"],
   exp:"У водорода +1, у кислорода −2. Сумма степеней окисления в молекуле равна нулю: 2·(+1) + x + 4·(−2) = 0, отсюда x = +6."},
  {id:"c4", subj:"chem", topic:"Расчёты", q:"Вычислите молярную массу углекислого газа CO₂ в г/моль.", answers:["44","44 г/моль"],
   exp:"M(CO₂) = 12 + 2·16 = 44 г/моль. Атомные массы округляют до целых, кроме хлора (35,5)."},
  {id:"c5", subj:"chem", topic:"Реакции", q:"Какой газ выделяется при взаимодействии цинка с соляной кислотой?", answers:["водород","h2","водород h2"],
   exp:"Zn + 2HCl → ZnCl₂ + H₂↑. Металл левее водорода в ряду активности вытесняет его из раствора кислоты."},

  // Физика
  {id:"p1", subj:"phys", topic:"Механика", q:"В каких единицах СИ измеряется сила?", answers:["ньютон","н","ньютонах","в ньютонах"],
   exp:"Сила измеряется в ньютонах: 1 Н = 1 кг·м/с². Это производная единица, она следует прямо из второго закона Ньютона."},
  {id:"p2", subj:"phys", topic:"Динамика", q:"Тело массой 2 кг движется с ускорением 3 м/с². Чему равна равнодействующая сила в ньютонах?", answers:["6","6 н","6н"],
   exp:"Второй закон Ньютона: F = ma = 2 кг · 3 м/с² = 6 Н. Сила направлена туда же, куда ускорение."},
  {id:"p3", subj:"phys", topic:"Механика", q:"Как называется явление сохранения скорости тела при отсутствии действия других тел?", answers:["инерция"],
   exp:"Инерция описана первым законом Ньютона: в инерциальной системе отсчёта тело покоится или движется равномерно и прямолинейно, пока на него не подействуют."},
  {id:"p4", subj:"phys", topic:"Электричество", q:"Напряжение на участке цепи 12 В, сила тока 2 А. Чему равно сопротивление в омах?", answers:["6","6 ом"],
   exp:"Закон Ома для участка цепи: R = U / I = 12 В / 2 А = 6 Ом."},
  {id:"p5", subj:"phys", topic:"Энергия", q:"Какая физическая величина измеряется в джоулях? (назовите одну)", answers:["энергия","работа","количество теплоты","теплота"],
   exp:"В джоулях измеряют работу, энергию и количество теплоты — все три величины одной природы, поэтому единица общая. Мощность измеряется уже в ваттах."},

  // Математика
  {id:"m1", subj:"math", topic:"Вычисления", q:"Найдите значение выражения 0,4 · 25.", answers:["10"],
   exp:"0,4 · 25 = 4 · 2,5 = 10. Удобно перенести запятую: умножение на 25 — это деление на 4 и умножение на 100."},
  {id:"m2", subj:"math", topic:"Уравнения", q:"Решите уравнение 3x − 7 = 14.", answers:["7","x=7"],
   exp:"3x = 14 + 7 = 21, значит x = 21 : 3 = 7. Проверка: 3·7 − 7 = 14."},
  {id:"m3", subj:"math", topic:"Проценты", q:"Найдите 15 % от числа 240.", answers:["36"],
   exp:"15 % = 0,15, поэтому 240 · 0,15 = 36. Быстрый способ: 10 % это 24, 5 % это 12, вместе 36."},
  {id:"m4", subj:"math", topic:"Геометрия", q:"Площадь прямоугольника равна 48, одна из его сторон 6. Найдите другую сторону.", answers:["8"],
   exp:"S = ab, значит b = S : a = 48 : 6 = 8."},

  // Русский язык
  {id:"r1", subj:"rus", topic:"Ударение", q:"В каком из слов ударение падает на первый слог: торты, звонит, договор, красивее?", answers:["торты"],
   exp:"Правильно: тОрты, звонИт, договОр, красИвее. Запомнить помогает ряд «тОрты — бАнты — шАрфы — пОрты» — у них ударение неподвижное и всегда на основе."},
  {id:"r2", subj:"rus", topic:"Приставки", q:"Какая гласная пишется в приставке слова пр..одолеть — е или и? (напишите одну букву)", answers:["е"],
   exp:"Преодолеть: приставка пре- близка по значению к пере-. Приставка при- означала бы приближение, присоединение или неполноту действия."},
  {id:"r3", subj:"rus", topic:"Н и НН", q:"Сколько букв н пишется в слове стекля(н/нн)ый? Напишите н или нн.", answers:["нн"],
   exp:"Стеклянный — одно из трёх слов-исключений: стеклянный, оловянный, деревянный. Остальные прилагательные с суффиксами -ян-, -ан-, -ин- пишутся с одной н."},
  {id:"r4", subj:"rus", topic:"Части речи", q:"Какой частью речи является слово «вследствие» в предложении «Вследствие дождя игра отменена»?", answers:["предлог","производный предлог"],
   exp:"Здесь это производный предлог: пишется слитно и с е на конце, заменяется на «из-за». Существительное «в следствии» пишется раздельно — «в следствии по делу»."},
];

// ---------- Английская версия заданий ----------
// Для английского интерфейса: тема, условие, разбор и дополнительные варианты ответа.
// В заданиях по русскому языку сами слова остаются русскими — переводится только инструкция.
type TaskEn = { topic: string; q: string; answers?: string[]; exp: string };
const EN: Record<string, TaskEn> = {
  h1: { topic: "Kievan Rus", q: "In what year did the Baptism of Rus take place?", answers: ["988 ad"],
    exp: "Prince Vladimir Svyatoslavich adopted Christianity and baptised Kiev in 988. It is one of the key dates in the FIPI codifier and opens the Christian period of Old Russian history." },
  h2: { topic: "Struggle against the Horde", q: "Give the year of the Battle of Kulikovo.", exp: "On 8 September 1380 Dmitry Donskoy's army defeated Mamai's Horde troops on Kulikovo Field. Dependence on the Horde remained, though — it was finally ended by the Great Stand on the Ugra River in 1480." },
  h3: { topic: "Muscovite state", q: "In what year was the Sudebnik (law code) of Ivan III adopted?", exp: "The Sudebnik of 1497 was the first all-Russian code of laws. It introduced St George's Day: peasants could leave their landlord only one week before and one week after 26 November, after paying a fee." },
  h4: { topic: "Great Reforms", q: "Give the year serfdom was abolished in Russia.", exp: "On 19 February 1861 Alexander II signed the Emancipation Manifesto. Peasants became personally free but had to buy out their land — hence the 'temporarily obligated' status and redemption payments." },
  h5: { topic: "Kievan Rus", q: "What was the law code begun under Yaroslav the Wise called? (Russian name, two words)", answers: ["russkaya pravda", "russian truth", "russian justice"],
    exp: "Russkaya Pravda ('Russian Justice') is the first written code of Old Russian law. Begun under Yaroslav the Wise, it was extended by his sons (Pravda Yaroslavichey) and by Vladimir Monomakh." },
  h6: { topic: "Modern Russia", q: "In what year was the current Constitution of the Russian Federation adopted?", exp: "The Constitution was adopted by nationwide vote on 12 December 1993. The 2020 amendments did not replace it — it is the same Constitution in a new wording." },
  s1: { topic: "Society", q: "What type of society treats information as its main resource and has an economy dominated by services?", answers: ["post-industrial", "postindustrial", "information", "information society", "post-industrial society"],
    exp: "The codifier names three types of society: traditional (agrarian), industrial (manufacturing, mass production) and post-industrial, also called the information society — services, knowledge and computer technology." },
  s2: { topic: "Politics", q: "Name the highest executive body of the Russian Federation. (two words)", answers: ["russian government", "the government", "government of russia", "government of the russian federation"],
    exp: "The Government of the Russian Federation heads the executive branch. Don't confuse it: the legislature is the Federal Assembly, the judiciary is the courts, and the President formally belongs to none of the three." },
  s3: { topic: "Law", q: "At what age does full legal capacity normally begin in Russia?", answers: ["18 years", "at 18", "eighteen"],
    exp: "Under Article 21 of the Civil Code, full legal capacity begins at 18. Exceptions are marriage before adulthood and emancipation from 16." },
  s4: { topic: "Law", q: "What is the term for a person's ability to acquire and exercise rights and duties through their own actions? (two words)", answers: ["legal capacity", "active legal capacity", "capacity"],
    exp: "Active legal capacity (deesposobnost) is the ability to act yourself. Passive legal capacity (pravosposobnost) begins at birth and belongs to everyone, even a baby: it is the ability to have rights." },
  s5: { topic: "Politics", q: "Name the form of government in which the head of state's power is inherited.", answers: ["monarchy"],
    exp: "Form of government answers who gets power and how: monarchy (by inheritance) or republic (by election). Don't confuse it with the form of territorial structure — federation or unitary state." },
  b1: { topic: "The cell", q: "Which cell organelle is responsible for protein synthesis?", answers: ["ribosome", "ribosomes"],
    exp: "The ribosome assembles a protein from amino acids following the mRNA template — this is translation. Ribosomes are found in the cytoplasm, on the rough ER and inside mitochondria and chloroplasts." },
  b2: { topic: "Genetics", q: "How many chromosomes does a human somatic cell contain?", exp: "The human diploid set is 2n = 46: 44 autosomes and 2 sex chromosomes. After meiosis, gametes keep the haploid set — 23 chromosomes." },
  b3: { topic: "Metabolism", q: "What is the process of making organic matter from carbon dioxide and water using light called?", answers: ["photosynthesis"],
    exp: "Photosynthesis takes place in chloroplasts: the light stage on the thylakoid membranes produces ATP and NADPH, the dark stage in the stroma fixes CO₂ into glucose (the Calvin cycle)." },
  b4: { topic: "Cell biology", q: "Which organelle is called the 'powerhouse of the cell', where organic matter is oxidised to produce ATP?", answers: ["mitochondrion", "mitochondria"],
    exp: "The mitochondrion carries out the oxygen stage of energy metabolism. The respiratory chain works on the cristae, and one mole of glucose yields 38 ATP molecules in total." },
  b5: { topic: "Human biology", q: "How many chambers does the human heart have?", answers: ["four", "4 chambers"],
    exp: "Two atria and two ventricles. The right half pumps venous blood into the pulmonary circuit, the left half pumps arterial blood into the systemic circuit; the left ventricle has the thickest wall." },
  c1: { topic: "Atomic structure", q: "How many protons are in a nitrogen atom?", exp: "The number of protons equals the element's atomic number. Nitrogen is number 7, so it has 7 protons and, in a neutral atom, 7 electrons." },
  c2: { topic: "Classes of compounds", q: "Write the formula of sulfuric acid.", exp: "H₂SO₄ is a diprotic oxygen-containing acid. Don't confuse it with sulfurous acid H₂SO₃ and hydrogen sulfide H₂S." },
  c3: { topic: "Oxidation states", q: "Find the oxidation state of sulfur in H₂SO₄. (with a sign, e.g. +2)", exp: "Hydrogen is +1, oxygen is −2. Oxidation states in a molecule add up to zero: 2·(+1) + x + 4·(−2) = 0, so x = +6." },
  c4: { topic: "Calculations", q: "Calculate the molar mass of carbon dioxide CO₂ in g/mol.", answers: ["44 g/mol"],
    exp: "M(CO₂) = 12 + 2·16 = 44 g/mol. Atomic masses are rounded to whole numbers, except chlorine (35.5)." },
  c5: { topic: "Reactions", q: "Which gas is released when zinc reacts with hydrochloric acid?", answers: ["hydrogen", "h2", "hydrogen h2"],
    exp: "Zn + 2HCl → ZnCl₂ + H₂↑. A metal to the left of hydrogen in the activity series displaces it from an acid solution." },
  p1: { topic: "Mechanics", q: "What is the SI unit of force?", answers: ["newton", "newtons", "n"],
    exp: "Force is measured in newtons: 1 N = 1 kg·m/s². It is a derived unit that follows directly from Newton's second law." },
  p2: { topic: "Dynamics", q: "A 2 kg body moves with an acceleration of 3 m/s². What is the net force in newtons?", answers: ["6 n"],
    exp: "Newton's second law: F = ma = 2 kg · 3 m/s² = 6 N. The force points in the same direction as the acceleration." },
  p3: { topic: "Mechanics", q: "What is the phenomenon of a body keeping its velocity when no other bodies act on it called?", answers: ["inertia"],
    exp: "Inertia is described by Newton's first law: in an inertial frame a body stays at rest or moves uniformly in a straight line until something acts on it." },
  p4: { topic: "Electricity", q: "The voltage across a section of a circuit is 12 V and the current is 2 A. What is the resistance in ohms?", answers: ["6 ohm", "6 ohms"],
    exp: "Ohm's law for a section of a circuit: R = U / I = 12 V / 2 A = 6 Ω." },
  p5: { topic: "Energy", q: "Name a physical quantity measured in joules.", answers: ["energy", "work", "heat", "quantity of heat"],
    exp: "Work, energy and quantity of heat are all measured in joules — they are the same kind of quantity, so they share a unit. Power, by contrast, is measured in watts." },
  m1: { topic: "Arithmetic", q: "Find the value of 0.4 · 25.", exp: "0.4 · 25 = 4 · 2.5 = 10. A handy trick: multiplying by 25 is the same as dividing by 4 and multiplying by 100." },
  m2: { topic: "Equations", q: "Solve the equation 3x − 7 = 14.", exp: "3x = 14 + 7 = 21, so x = 21 ÷ 3 = 7. Check: 3·7 − 7 = 14." },
  m3: { topic: "Percentages", q: "Find 15% of 240.", exp: "15% = 0.15, so 240 · 0.15 = 36. Quick way: 10% is 24, 5% is 12, together 36." },
  m4: { topic: "Geometry", q: "The area of a rectangle is 48 and one side is 6. Find the other side.", exp: "S = ab, so b = S ÷ a = 48 ÷ 6 = 8." },
  r1: { topic: "Word stress", q: "Which of these Russian words is stressed on the first syllable: торты, звонит, договор, красивее? (type the word in Russian)",
    exp: "Correct stress: тОрты, звонИт, договОр, красИвее. The series «тОрты — бАнты — шАрфы — пОрты» helps to remember: their stress is fixed and always falls on the stem." },
  r2: { topic: "Prefixes", q: "Which vowel goes in the prefix of пр..одолеть — е or и? (type one Russian letter)",
    exp: "Преодолеть: the prefix пре- is close in meaning to пере- ('over'). The prefix при- would mean approaching, attaching or an incomplete action." },
  r3: { topic: "Н and НН", q: "How many letters н are in стекля(н/нн)ый? Type н or нн.",
    exp: "Стеклянный is one of the three exception words: стеклянный, оловянный, деревянный. Other adjectives with the suffixes -ян-, -ан-, -ин- are written with one н." },
  r4: { topic: "Parts of speech", q: "Which part of speech is «вследствие» in the sentence «Вследствие дождя игра отменена»? (answer in Russian or English)", answers: ["preposition", "derived preposition"],
    exp: "Here it is a derived preposition: written as one word ending in е, and it can be replaced with «из-за» ('because of'). The noun phrase «в следствии» is written separately — «в следствии по делу» ('in the investigation')." },
};

/** Задание на текущем языке. В английском принимаются ответы на обоих языках. */
export function localTask(t: Task, en: boolean): Task {
  const e = en ? EN[t.id] : undefined;
  if (!e) return t;
  return { ...t, topic: e.topic, q: e.q, exp: e.exp, answers: [...t.answers, ...(e.answers || [])] };
}
