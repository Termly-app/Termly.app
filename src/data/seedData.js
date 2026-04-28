// ============= CBC LEVEL STRUCTURE =============
// Kenya's Competency Based Curriculum (KICD)

var CBC_STRUCTURE = {
  'Early Years': {
    grades: ['Playgroup', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'],
    subjects: [
      'Literacy Activities',
      'Mathematical Activities',
      'Environmental Activities',
      'Creative Activities',
      'Religious Education',
    ],
    assessmentType: 'competency',
    description: 'Activity-based learning focused on literacy, numeracy, and social skills',
  },
  'Upper Primary': {
    grades: ['Grade 4', 'Grade 5', 'Grade 6'],
    subjects: [
      'English',
      'Kiswahili',
      'Mathematics',
      'Science & Technology',
      'Social Studies',
      'Agriculture & Nutrition',
      'Creative Arts',
      'Physical & Health Education',
    ],
    assessmentType: 'mixed',
    description: 'Expanded learning areas with continuous assessment. KPSEA at Grade 6.',
  },
  'Junior Secondary': {
    grades: ['Grade 7', 'Grade 8', 'Grade 9'],
    subjects: [
      'English',
      'Kiswahili',
      'Mathematics',
      'Integrated Science',
      'Social Studies',
      'Pre-Technical Studies',
      'Agriculture',
      'ICT',
      'Health Education',
      'Life Skills Education',
    ],
    assessmentType: 'mixed',
    description: 'Academic and career pathway exploration with structured assessments.',
  },
  'Senior Secondary': {
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    pathways: ['STEM', 'Social Sciences', 'Arts & Sports Science'],
    subjects: {
      'STEM': ['Advanced Math', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Technical Drawing'],
      'Social Sciences': ['English', 'Kiswahili', 'History & Government', 'Geography', 'Religious Education', 'Business Studies'],
      'Arts & Sports Science': ['Music', 'Visual Arts', 'Physical Education', 'Performing Arts', 'Sports Management'],
    },
    assessmentType: 'marks',
    description: 'Specialization based on talent and interests. Preparation for higher education or career.',
  },
  'Secondary (8-4-4)': {
    grades: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
    subjects: [
      'English',
      'Kiswahili',
      'Mathematics',
      'Biology',
      'Physics',
      'Chemistry',
      'History & Government',
      'Geography',
      'Christian Religious Education',
      'Business Studies',
      'Agriculture',
    ],
    assessmentType: 'marks',
    description: 'Traditional secondary school curriculum (8-4-4 system).',
  },
};

// Helper: Get level for a grade
function getLevelForGrade(grade) {
  if (!grade) return 'Upper Primary';
  const cleanGrade = String(grade).trim().toLowerCase();
  for (const [level, data] of Object.entries(CBC_STRUCTURE)) {
    if (data.grades.some(g => g.trim().toLowerCase() === cleanGrade)) return level;
  }
  return 'Upper Primary';
}

// Helper: Get subjects for a grade
function getSubjectsForGrade(grade, profile = null, pathway = null) {
  if (!grade) return [];
  const level = getLevelForGrade(grade);
  const levelData = CBC_STRUCTURE[level];
  
  // Use custom subjects from profile if they exist for this level
  // Normalizing the level key access
  const cleanLevel = level.trim();
  if (profile?.customSubjects?.[cleanLevel]) {
    return profile.customSubjects[cleanLevel];
  }
  
  // Fallback to default subjects from seedData
  const defaultSubs = levelData.subjects;
  if (!Array.isArray(defaultSubs)) {
    // It's a pathway object (Senior Secondary)
    if (pathway && defaultSubs[pathway]) {
      return defaultSubs[pathway];
    }
    // Union of ALL subjects across all pathways
    return [...new Set(Object.values(defaultSubs).flat())];
  }
  
  return defaultSubs;
}

// All grades across all levels
var ALL_GRADES = Object.values(CBC_STRUCTURE).flatMap(l => l.grades);
var CLASSES = ALL_GRADES; // alias used by Students, Fees, Attendance pages

// CBC Competency levels
var CBC_LEVELS = [
  'Exceeding Expectation',
  'Meeting Expectation',
  'Approaching Expectation',
  'Below Expectation',
];

var CBC_CORE_COMPETENCIES = [
  'Communication & Collaboration',
  'Critical Thinking & Problem Solving',
  'Creativity & Imagination',
  'Citizenship',
  'Digital Literacy',
  'Learning to Learn',
  'Self-Efficacy',
];

var TERM_FEE = 0; // KSh per term (Default 0, set by admin)
var STREAMS = ['East', 'West', 'North', 'South'];

// ============= SEED USERS =============
var seedUsers = [
  { id: 'U001', name: 'System Admin', email: 'admin@Termly.com', role: 'Admin' },
  { id: 'U004', name: 'Platform Owner', email: 'Termly8@gmail.com', role: 'Admin' },
  { id: 'U002', name: 'Finance User', email: 'finance@Termly.com', role: 'Finance' },
  { id: 'U003', name: 'Teacher User', email: 'teacher@Termly.com', role: 'Teacher' },
];

// ============= SEED STUDENTS =============
var students = [
  // Early Years
  { id: '001', admNo: 'SS-2024-001', name: 'Oscar Mwangi', class: 'PP1', stream: 'East', parent: 'Patrick Mwangi', parentPhone: '0755678902', gender: 'Male', dob: '2020-03-05', joinDate: '2025-01-06', notes: '' },
  { id: '002', admNo: 'SS-2024-002', name: 'Yvonne Kemunto', class: 'PP1', stream: 'East', parent: 'Rachel Kemunto', parentPhone: '0740567891', gender: 'Female', dob: '2020-10-14', joinDate: '2025-01-06', notes: '' },
  { id: '003', admNo: 'SS-2024-003', name: 'Liam Njau', class: 'PP2', stream: 'West', parent: 'James Njau', parentPhone: '0712000111', gender: 'Male', dob: '2019-06-20', joinDate: '2024-01-08', notes: '' },
  { id: '004', admNo: 'SS-2024-004', name: 'Pauline Adhiambo', class: 'PP2', stream: 'West', parent: 'Agnes Adhiambo', parentPhone: '0766789013', gender: 'Female', dob: '2019-07-19', joinDate: '2024-01-08', notes: '' },
  { id: '005', admNo: 'SS-2024-005', name: 'Moses Njoroge', class: 'Grade 1', stream: 'East', parent: 'Francis Njoroge', parentPhone: '0733456780', gender: 'Male', dob: '2018-06-28', joinDate: '2024-01-08', notes: '' },
  { id: '006', admNo: 'SS-2024-006', name: 'Nancy Nyambura', class: 'Grade 1', stream: 'East', parent: 'Elizabeth Nyambura', parentPhone: '0744567891', gender: 'Female', dob: '2018-09-10', joinDate: '2024-01-08', notes: '' },
  { id: '007', admNo: 'SS-2024-007', name: 'Xavier Mutiso', class: 'Grade 2', stream: 'North', parent: 'Charles Mutiso', parentPhone: '0730456780', gender: 'Male', dob: '2017-12-01', joinDate: '2023-01-09', notes: '' },
  { id: '008', admNo: 'SS-2024-008', name: 'Faith Auma', class: 'Grade 2', stream: 'North', parent: 'Grace Auma', parentPhone: '0700123458', gender: 'Female', dob: '2017-07-11', joinDate: '2023-01-09', notes: '' },
  { id: '009', admNo: 'SS-2024-009', name: 'Kelvin Otieno', class: 'Grade 3', stream: 'South', parent: 'Michael Otieno', parentPhone: '0711234568', gender: 'Male', dob: '2016-01-22', joinDate: '2023-01-09', notes: '' },
  { id: '010', admNo: 'SS-2024-010', name: 'Linet Chebet', class: 'Grade 3', stream: 'South', parent: 'Sarah Chebet', parentPhone: '0722345679', gender: 'Female', dob: '2016-04-15', joinDate: '2023-01-09', notes: '' },
  { id: '011', admNo: 'SS-2024-011', name: 'Winnie Nekesa', class: 'Grade 3', stream: 'South', parent: 'Judith Nekesa', parentPhone: '0720345679', gender: 'Female', dob: '2016-08-07', joinDate: '2023-01-09', notes: '' },

  // Upper Primary
  { id: '012', admNo: 'SS-2024-012', name: 'Irene Wambui', class: 'Grade 4', stream: 'East', parent: 'Lucy Wambui', parentPhone: '0790123456', gender: 'Female', dob: '2015-08-12', joinDate: '2022-01-12', notes: '' },
  { id: '013', admNo: 'SS-2024-013', name: 'James Kamau', class: 'Grade 4', stream: 'East', parent: 'Joseph Kamau', parentPhone: '0701234567', gender: 'Male', dob: '2015-11-03', joinDate: '2022-01-12', notes: '' },
  { id: '014', admNo: 'SS-2024-014', name: 'Victor Sang', class: 'Grade 4', stream: 'West', parent: 'William Sang', parentPhone: '0710234568', gender: 'Male', dob: '2015-05-18', joinDate: '2022-01-12', notes: '' },
  { id: '015', admNo: 'SS-2024-015', name: 'Emmanuel Rotich', class: 'Grade 5', stream: 'East', parent: 'Isaiah Rotich', parentPhone: '0790012346', gender: 'Male', dob: '2014-02-27', joinDate: '2021-01-10', notes: '' },
  { id: '016', admNo: 'SS-2024-016', name: 'Grace Njeri', class: 'Grade 5', stream: 'West', parent: 'Ann Njeri', parentPhone: '0778901234', gender: 'Female', dob: '2014-02-17', joinDate: '2021-01-10', notes: '' },
  { id: '017', admNo: 'SS-2024-017', name: 'Hassan Omar', class: 'Grade 5', stream: 'North', parent: 'Omar Ali', parentPhone: '0789012345', gender: 'Male', dob: '2014-05-30', joinDate: '2021-01-10', notes: '' },
  { id: '018', admNo: 'SS-2024-018', name: 'Unity Moraa', class: 'Grade 5', stream: 'South', parent: 'Christine Moraa', parentPhone: '0700123457', gender: 'Female', dob: '2014-11-30', joinDate: '2021-01-10', notes: '' },
  { id: '019', admNo: 'SS-2024-019', name: 'Esther Akinyi', class: 'Grade 6', stream: 'East', parent: 'Rose Akinyi', parentPhone: '0756789012', gender: 'Female', dob: '2013-07-08', joinDate: '2020-01-15', notes: 'KPSEA candidate' },
  { id: '020', admNo: 'SS-2024-020', name: 'Felix Mutua', class: 'Grade 6', stream: 'East', parent: 'John Mutua', parentPhone: '0767890123', gender: 'Male', dob: '2013-09-25', joinDate: '2020-01-15', notes: '' },
  { id: '021', admNo: 'SS-2024-021', name: 'Timothy Odhiambo', class: 'Grade 6', stream: 'West', parent: 'George Odhiambo', parentPhone: '0799012346', gender: 'Male', dob: '2013-02-14', joinDate: '2020-01-15', notes: '' },
  { id: '022', admNo: 'SS-2024-022', name: 'Benjamin Korir', class: 'Grade 6', stream: 'West', parent: 'Elijah Korir', parentPhone: '0770890124', gender: 'Male', dob: '2013-11-16', joinDate: '2020-01-15', notes: '' },
  { id: '023', admNo: 'SS-2024-023', name: 'Diana Mwende', class: 'Grade 6', stream: 'North', parent: 'Faith Mwende', parentPhone: '0780901235', gender: 'Female', dob: '2013-09-03', joinDate: '2020-01-15', notes: '' },

  // Junior Secondary
  { id: '024', admNo: 'SS-2024-024', name: 'Amina Wanjiku', class: 'Grade 7', stream: 'East', parent: 'Mary Wanjiku', parentPhone: '0712345678', gender: 'Female', dob: '2012-03-14', joinDate: '2019-01-15', notes: '' },
  { id: '025', admNo: 'SS-2024-025', name: 'Brian Ochieng', class: 'Grade 7', stream: 'East', parent: 'Peter Ochieng', parentPhone: '0723456789', gender: 'Male', dob: '2012-06-02', joinDate: '2019-01-15', notes: '' },
  { id: '026', admNo: 'SS-2024-026', name: 'Catherine Muthoni', class: 'Grade 7', stream: 'West', parent: 'Jane Muthoni', parentPhone: '0734567890', gender: 'Female', dob: '2012-01-20', joinDate: '2019-01-15', notes: '' },
  { id: '027', admNo: 'SS-2024-027', name: 'David Kipchoge', class: 'Grade 8', stream: 'East', parent: 'Samuel Kipchoge', parentPhone: '0745678901', gender: 'Male', dob: '2011-04-11', joinDate: '2018-01-10', notes: '' },
  { id: '028', admNo: 'SS-2024-028', name: 'Raphael Kibet', class: 'Grade 8', stream: 'East', parent: 'Daniel Kibet', parentPhone: '0777890124', gender: 'Male', dob: '2011-10-08', joinDate: '2018-01-10', notes: 'Class prefect' },
  { id: '029', admNo: 'SS-2024-029', name: 'Sophia Wairimu', class: 'Grade 8', stream: 'West', parent: 'Margaret Wairimu', parentPhone: '0788901235', gender: 'Female', dob: '2011-12-25', joinDate: '2018-01-10', notes: '' },
  { id: '030', admNo: 'SS-2024-030', name: 'Zakayo Wekesa', class: 'Grade 9', stream: 'East', parent: 'Simon Wekesa', parentPhone: '0750678902', gender: 'Male', dob: '2010-04-22', joinDate: '2017-01-12', notes: '' },
  { id: '031', admNo: 'SS-2024-031', name: 'Alice Njoki', class: 'Grade 9', stream: 'East', parent: 'David Njoki', parentPhone: '0760789013', gender: 'Female', dob: '2010-06-30', joinDate: '2017-01-12', notes: '' },
  { id: '032', admNo: 'SS-2024-032', name: 'Peter Wangari', class: 'Grade 9', stream: 'West', parent: 'John Wangari', parentPhone: '0771234567', gender: 'Male', dob: '2010-09-15', joinDate: '2017-01-12', notes: '' },
];

// ============= GENERATORS =============

function generateMarks() {
  const marks = {};
  students.forEach(s => {
    const level = getLevelForGrade(s.class);
    const subjects = getSubjectsForGrade(s.class);
    marks[s.id] = {};
    if (level === 'Early Years') {
      // Early Years: lighter marks, more competency-focused
      subjects.forEach(sub => { marks[s.id][sub] = Math.floor(Math.random() * 30) + 65; });
    } else {
      subjects.forEach(sub => { marks[s.id][sub] = Math.floor(Math.random() * 40) + 55; });
    }
  });
  return marks;
}

function generateFees() {
  const fees = {};
  students.forEach(s => {
    const paid = Math.random() > 0.2
      ? (Math.random() > 0.5 ? TERM_FEE : Math.floor(Math.random() * 10000) + 3000) : 0;
    fees[s.id] = {
      totalFee: TERM_FEE, paid, balance: TERM_FEE - paid,
      payments: paid > 0 ? [{
        id: `PAY-${s.id}-1`, amount: paid, date: '2026-01-15',
        method: Math.random() > 0.5 ? 'M-Pesa' : 'Cash',
        reference: Math.random() > 0.5 ? `MPE${Math.floor(Math.random() * 9000) + 1000}` : ''
      }] : []
    };
  });
  return fees;
}

function generateAttendance() {
  const attendance = {};
  const today = new Date();
  for (let d = 0; d < 5; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    attendance[dateStr] = {};
    students.forEach(s => {
      const rand = Math.random();
      attendance[dateStr][s.id] = rand > 0.1 ? 'present' : (rand > 0.05 ? 'late' : 'absent');
    });
  }
  return attendance;
}

function generateCBC() {
  const cbc = {};
  students.forEach(s => {
    const subjects = getSubjectsForGrade(s.class);
    cbc[s.id] = {};
    subjects.forEach(sub => {
      const rand = Math.random();
      cbc[s.id][sub] = rand > 0.75 ? CBC_LEVELS[0] : rand > 0.35 ? CBC_LEVELS[1] : rand > 0.1 ? CBC_LEVELS[2] : CBC_LEVELS[3];
    });
  });
  return cbc;
}

function generateCoreCompetencies() {
  const cc = {};
  students.forEach(s => {
    cc[s.id] = {};
    CBC_CORE_COMPETENCIES.forEach(comp => {
      const rand = Math.random();
      cc[s.id][comp] = rand > 0.7 ? CBC_LEVELS[0] : rand > 0.3 ? CBC_LEVELS[1] : rand > 0.08 ? CBC_LEVELS[2] : CBC_LEVELS[3];
    });
  });
  return cc;
}

// ============= SEED TEACHERS =============
var seedTeachers = [
  { id: 'T001', name: 'John Mwangi', phone: '0722100200', status: 'Active' },
  { id: 'T002', name: 'Mary Achieng', phone: '0733200300', status: 'Active' },
  { id: 'T003', name: 'Peter Omondi', phone: '0744300400', status: 'Active' },
  { id: 'T004', name: 'Alice Wanjiru', phone: '0755400500', status: 'Active' },
  { id: 'T005', name: 'Samuel Kiprop', phone: '0766500600', status: 'Active' },
  { id: 'T006', name: 'Gladys Nyokabi', phone: '0777600700', status: 'Active' },
  { id: 'T007', name: 'Ibrahim Hassan', phone: '0788700800', status: 'Active' },
  { id: 'T008', name: 'Christine Mutindi', phone: '0799800900', status: 'Left' },
];

// Auto-assign teachers to subjects/classes
function generateSubjectAssignments() {
  const assignments = {}; // { 'Grade 7': { 'East': { 'Mathematics': 'T001', 'English': 'T002' } } }
  const activeTeachers = seedTeachers.filter(t => t.status === 'Active');

  // Simple round-robin per subject across all classes and streams
  let teacherIdx = 0;
  for (const [, levelData] of Object.entries(CBC_STRUCTURE)) {
    levelData.grades.forEach(grade => {
      assignments[grade] = {};
      STREAMS.forEach(stream => {
        assignments[grade][stream] = {};
        const subjects = getSubjectsForGrade(grade);
        subjects.forEach(subject => {
          assignments[grade][stream][subject] = activeTeachers[teacherIdx % activeTeachers.length].id;
          teacherIdx++;
        });
      });
    });
  }
  return assignments;
}

export {
  students, seedUsers, seedTeachers, CBC_STRUCTURE, ALL_GRADES, CLASSES, CBC_LEVELS, CBC_CORE_COMPETENCIES, TERM_FEE, STREAMS,
  getLevelForGrade, getSubjectsForGrade,
  generateMarks, generateFees, generateAttendance, generateCBC, generateCoreCompetencies,
  generateSubjectAssignments,
};
