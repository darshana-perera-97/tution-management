// Sample submodules data - organized by module
export const subModules = {
  'math-module-1': [
    {
      id: 'math-m1-sub1',
      moduleId: 'math-module-1',
      name: 'Introduction to Variables',
      timeAllocation: 2 // hours
    },
    {
      id: 'math-m1-sub2',
      moduleId: 'math-module-1',
      name: 'Linear Equations',
      timeAllocation: 3
    },
    {
      id: 'math-m1-sub3',
      moduleId: 'math-module-1',
      name: 'Quadratic Equations',
      timeAllocation: 4
    }
  ],
  'math-module-2': [
    {
      id: 'math-m2-sub1',
      moduleId: 'math-module-2',
      name: 'Basic Shapes',
      timeAllocation: 2
    },
    {
      id: 'math-m2-sub2',
      moduleId: 'math-module-2',
      name: 'Angles and Triangles',
      timeAllocation: 3
    },
    {
      id: 'math-m2-sub3',
      moduleId: 'math-module-2',
      name: 'Circles and Polygons',
      timeAllocation: 3
    },
    {
      id: 'math-m2-sub4',
      moduleId: 'math-module-2',
      name: 'Area and Perimeter',
      timeAllocation: 4
    }
  ],
  'math-module-3': [
    {
      id: 'math-m3-sub1',
      moduleId: 'math-module-3',
      name: 'Trigonometric Ratios',
      timeAllocation: 3
    },
    {
      id: 'math-m3-sub2',
      moduleId: 'math-module-3',
      name: 'Sine and Cosine Functions',
      timeAllocation: 4
    },
    {
      id: 'math-m3-sub3',
      moduleId: 'math-module-3',
      name: 'Trigonometric Identities',
      timeAllocation: 3
    }
  ],
  'math-module-4': [
    {
      id: 'math-m4-sub1',
      moduleId: 'math-module-4',
      name: 'Limits and Continuity',
      timeAllocation: 4
    },
    {
      id: 'math-m4-sub2',
      moduleId: 'math-module-4',
      name: 'Derivatives',
      timeAllocation: 5
    },
    {
      id: 'math-m4-sub3',
      moduleId: 'math-module-4',
      name: 'Integration',
      timeAllocation: 5
    }
  ],
  'science-module-1': [
    {
      id: 'sci-m1-sub1',
      moduleId: 'science-module-1',
      name: 'States of Matter',
      timeAllocation: 2
    },
    {
      id: 'sci-m1-sub2',
      moduleId: 'science-module-1',
      name: 'Energy Forms',
      timeAllocation: 3
    }
  ],
  'science-module-2': [
    {
      id: 'sci-m2-sub1',
      moduleId: 'science-module-2',
      name: 'Cell Structure',
      timeAllocation: 3
    },
    {
      id: 'sci-m2-sub2',
      moduleId: 'science-module-2',
      name: 'Ecosystems',
      timeAllocation: 4
    }
  ],
  'english-module-1': [
    {
      id: 'eng-m1-sub1',
      moduleId: 'english-module-1',
      name: 'Parts of Speech',
      timeAllocation: 3
    },
    {
      id: 'eng-m1-sub2',
      moduleId: 'english-module-1',
      name: 'Sentence Structure',
      timeAllocation: 3
    }
  ],
  'english-module-2': [
    {
      id: 'eng-m2-sub1',
      moduleId: 'english-module-2',
      name: 'Poetry Analysis',
      timeAllocation: 4
    },
    {
      id: 'eng-m2-sub2',
      moduleId: 'english-module-2',
      name: 'Prose Reading',
      timeAllocation: 3
    }
  ],
  'physics-module-1': [
    {
      id: 'phy-m1-sub1',
      moduleId: 'physics-module-1',
      name: 'Newton\'s Laws',
      timeAllocation: 4
    },
    {
      id: 'phy-m1-sub2',
      moduleId: 'physics-module-1',
      name: 'Momentum and Energy',
      timeAllocation: 4
    }
  ],
  'physics-module-2': [
    {
      id: 'phy-m2-sub1',
      moduleId: 'physics-module-2',
      name: 'Wave Properties',
      timeAllocation: 3
    },
    {
      id: 'phy-m2-sub2',
      moduleId: 'physics-module-2',
      name: 'Light and Optics',
      timeAllocation: 4
    }
  ],
  'chemistry-module-1': [
    {
      id: 'chem-m1-sub1',
      moduleId: 'chemistry-module-1',
      name: 'Atomic Theory',
      timeAllocation: 3
    },
    {
      id: 'chem-m1-sub2',
      moduleId: 'chemistry-module-1',
      name: 'Periodic Table',
      timeAllocation: 3
    }
  ],
  'chemistry-module-2': [
    {
      id: 'chem-m2-sub1',
      moduleId: 'chemistry-module-2',
      name: 'Chemical Equations',
      timeAllocation: 4
    },
    {
      id: 'chem-m2-sub2',
      moduleId: 'chemistry-module-2',
      name: 'Reaction Types',
      timeAllocation: 3
    }
  ],
  'biology-module-1': [
    {
      id: 'bio-m1-sub1',
      moduleId: 'biology-module-1',
      name: 'Cell Organelles',
      timeAllocation: 3
    },
    {
      id: 'bio-m1-sub2',
      moduleId: 'biology-module-1',
      name: 'Cell Division',
      timeAllocation: 3
    }
  ],
  'biology-module-2': [
    {
      id: 'bio-m2-sub1',
      moduleId: 'biology-module-2',
      name: 'Skeletal System',
      timeAllocation: 2
    },
    {
      id: 'bio-m2-sub2',
      moduleId: 'biology-module-2',
      name: 'Circulatory System',
      timeAllocation: 3
    },
    {
      id: 'bio-m2-sub3',
      moduleId: 'biology-module-2',
      name: 'Respiratory System',
      timeAllocation: 2
    }
  ]
};

// Sample timetable data - organized by student and module
export const timetables = {
  // This would typically come from the server
  // Format: studentId -> subjectId -> moduleId -> timetable data
  sample: {
    'math': {
      'math-module-2': {
        moduleId: 'math-module-2',
        moduleName: 'Module 2: Geometry',
        subModules: [
          {
            id: 'math-m2-sub1',
            name: 'Basic Shapes',
            timeAllocation: 2,
            scheduledHours: 2,
            completedHours: 0
          },
          {
            id: 'math-m2-sub2',
            name: 'Angles and Triangles',
            timeAllocation: 3,
            scheduledHours: 3,
            completedHours: 0
          },
          {
            id: 'math-m2-sub3',
            name: 'Circles and Polygons',
            timeAllocation: 3,
            scheduledHours: 3,
            completedHours: 0
          },
          {
            id: 'math-m2-sub4',
            name: 'Area and Perimeter',
            timeAllocation: 4,
            scheduledHours: 4,
            completedHours: 0
          }
        ],
        totalHours: 12
      }
    }
  }
};

export default subModules;

