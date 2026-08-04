import type { Card, Category, Deck } from './types'

export const categories: Category[] = [
  { id: 'cat-science', name: 'Science & Tech' },
  { id: 'cat-languages', name: 'Languages' },
  { id: 'cat-history', name: 'History' },
]

export const decks: Deck[] = [
  { id: 'deck-ml', name: 'Machine Learning', categoryId: 'cat-science', color: '#4F46E5' },
  { id: 'deck-react', name: 'React Patterns', categoryId: 'cat-science', color: '#0EA5E9' },
  { id: 'deck-spanish', name: 'Spanish B1', categoryId: 'cat-languages', color: '#16A34A' },
  { id: 'deck-latin', name: 'Latin Roots', categoryId: 'cat-languages', color: '#D97706' },
  { id: 'deck-rome', name: 'Ancient Rome', categoryId: 'cat-history', color: '#DC2626' },
  { id: 'deck-misc', name: 'Quick Notes', categoryId: null, color: '#6B7280' },
]

export const initialCards: Card[] = [
  // Machine Learning
  {
    id: 'c-ml-1',
    deckId: 'deck-ml',
    question: 'What is gradient descent?',
    answer:
      'An iterative optimization algorithm that adjusts model parameters by moving in the direction of steepest descent of the loss function — the negative gradient.',
    tags: ['optimization', 'fundamentals'],
  },
  {
    id: 'c-ml-2',
    deckId: 'deck-ml',
    question: 'Define overfitting.',
    answer:
      'When a model learns the training data too well — including its noise — causing high accuracy on training data but poor generalization to unseen examples.',
    tags: ['generalization', 'fundamentals'],
  },
  {
    id: 'c-ml-3',
    deckId: 'deck-ml',
    question: 'What is the bias-variance tradeoff?',
    answer:
      'The tension between underfitting (high bias, too simple) and overfitting (high variance, too complex). The optimal model minimizes total error = bias² + variance + irreducible noise.',
    tags: ['theory', 'fundamentals'],
  },
  {
    id: 'c-ml-4',
    deckId: 'deck-ml',
    question: 'What is cross-validation?',
    answer:
      'A technique that partitions data into k equal folds, training the model k times — each time using a different fold as the validation set. Produces a more reliable estimate of generalization error.',
    tags: ['evaluation', 'data'],
  },
  {
    id: 'c-ml-5',
    deckId: 'deck-ml',
    question: 'What is regularization?',
    answer:
      'A method to reduce overfitting by adding a penalty term to the loss function. L1 (Lasso) encourages sparsity; L2 (Ridge) penalizes large weights by their square.',
    tags: ['optimization', 'generalization'],
  },
  {
    id: 'c-ml-6',
    deckId: 'deck-ml',
    question: 'What is a confusion matrix?',
    answer:
      'A table comparing predicted vs. actual class labels. Rows represent actual classes; columns represent predicted classes. Reveals true positives, false positives, true negatives, and false negatives.',
    tags: ['evaluation', 'classification'],
  },
  {
    id: 'c-ml-7',
    deckId: 'deck-ml',
    question: 'What is transfer learning?',
    answer:
      'Reusing a model pre-trained on one task (e.g. ImageNet classification) as the starting point for a new related task. The pre-trained layers capture reusable feature representations.',
    tags: ['deep-learning', 'advanced'],
  },
  {
    id: 'c-ml-8',
    deckId: 'deck-ml',
    question: 'What is a hyperparameter?',
    answer:
      'A configuration value set before training that controls the learning process itself — such as learning rate, number of layers, or batch size. Distinguished from model parameters, which are learned during training.',
    tags: ['fundamentals', 'training'],
  },

  // React Patterns
  {
    id: 'c-react-1',
    deckId: 'deck-react',
    question: 'What is the compound component pattern?',
    answer:
      'A pattern where multiple components share implicit state through React context, allowing consumers to compose them flexibly without prop drilling. Common example: <Select> + <Select.Option>.',
    tags: ['patterns', 'composition'],
  },
  {
    id: 'c-react-2',
    deckId: 'deck-react',
    question: 'When should you use useReducer over useState?',
    answer:
      'When state transitions are complex, multiple sub-values are interdependent, or the next state depends on the current one. useReducer centralizes update logic and is easier to test.',
    tags: ['hooks', 'state'],
  },
  {
    id: 'c-react-3',
    deckId: 'deck-react',
    question: 'What is the render props pattern?',
    answer:
      "A technique where a component's prop accepts a function that returns JSX. The parent component calls it with shared state or behavior, giving the consumer full control over the rendered output.",
    tags: ['patterns', 'advanced'],
  },
  {
    id: 'c-react-4',
    deckId: 'deck-react',
    question: 'What does React.memo do?',
    answer:
      'A higher-order component that memoizes the rendered output of a function component. React skips re-rendering if the props are shallowly equal, preventing unnecessary work in pure presentational components.',
    tags: ['performance', 'memoization'],
  },
  {
    id: 'c-react-5',
    deckId: 'deck-react',
    question: 'What is the purpose of useCallback?',
    answer:
      'Returns a memoized callback function that only changes when its dependencies change. Useful for passing stable function references to memoized child components or to avoid stale closures.',
    tags: ['hooks', 'performance'],
  },

  // Spanish B1
  {
    id: 'c-sp-1',
    deckId: 'deck-spanish',
    question: '¿Qué significa "aunque"?',
    answer:
      '"Although" or "even though" — a concessive conjunction introducing a clause that contrasts with the main clause. E.g., "Aunque llueve, salgo." (Even though it\'s raining, I\'m going out.)',
    tags: ['grammar', 'conjunctions'],
  },
  {
    id: 'c-sp-2',
    deckId: 'deck-spanish',
    question: 'Conjugate "tener" in the preterite, 3rd person plural.',
    answer:
      '"Tuvieron" — they had. Note the irregular stem "tuv-". Preterite of tener: tuve, tuviste, tuvo, tuvimos, tuvisteis, tuvieron.',
    tags: ['verbs', 'preterite'],
  },
  {
    id: 'c-sp-3',
    deckId: 'deck-spanish',
    question: 'What is the difference between "ser" and "estar"?',
    answer:
      'Both mean "to be" but differ in usage. "Ser" expresses permanent/inherent qualities (identity, origin, profession). "Estar" expresses temporary states, location, and conditions.',
    tags: ['grammar', 'verbs', 'fundamentals'],
  },
  {
    id: 'c-sp-4',
    deckId: 'deck-spanish',
    question: 'When do you use the subjunctive in Spanish?',
    answer:
      "After expressions of doubt, desire, emotion, or uncertainty — e.g., \"Espero que vengas\" (I hope you come). Also after conjunctions like \"para que\", \"a menos que\", and in hypothetical clauses.",
    tags: ['grammar', 'subjunctive', 'advanced'],
  },
  {
    id: 'c-sp-5',
    deckId: 'deck-spanish',
    question: 'Translate: "The more I study, the more I learn."',
    answer:
      '"Cuanto más estudio, más aprendo." This uses the cuanto más... más construction, equivalent to the English "the more... the more" comparative structure.',
    tags: ['grammar', 'comparatives'],
  },
  {
    id: 'c-sp-6',
    deckId: 'deck-spanish',
    question: 'What is the "personal a" in Spanish?',
    answer:
      'A preposition placed before a direct object that is a specific person or personified entity. E.g., "Veo a mi hermano" (I see my brother). Not used with indefinite persons or things.',
    tags: ['grammar', 'syntax'],
  },

  // Latin Roots
  {
    id: 'c-lat-1',
    deckId: 'deck-latin',
    question: 'What does the Latin root "duc/duct" mean?',
    answer:
      '"To lead" or "to pull." Found in: conduct, deduce, produce, introduce, educate, aqueduct. Knowing this root unlocks dozens of English words.',
    tags: ['roots', 'latin'],
  },
  {
    id: 'c-lat-2',
    deckId: 'deck-latin',
    question: 'What does the Latin root "spec/spect" mean?',
    answer:
      '"To look" or "to see." Found in: spectator, inspect, perspective, retrospect, spectrum, conspicuous, respect. From Latin "specere."',
    tags: ['roots', 'latin'],
  },
  {
    id: 'c-lat-3',
    deckId: 'deck-latin',
    question: 'What does the Latin root "port" mean?',
    answer:
      '"To carry." Found in: transport, export, import, portable, portfolio, report, support, deport. From Latin "portare."',
    tags: ['roots', 'latin'],
  },
  {
    id: 'c-lat-4',
    deckId: 'deck-latin',
    question: 'What does the Latin root "scrib/script" mean?',
    answer:
      '"To write." Found in: describe, prescribe, subscribe, manuscript, inscription, postscript, transcribe, scripture. From Latin "scribere."',
    tags: ['roots', 'latin'],
  },

  // Ancient Rome
  {
    id: 'c-rome-1',
    deckId: 'deck-rome',
    question: 'What were the Twelve Tables?',
    answer:
      'The earliest written codification of Roman law, inscribed on twelve bronze tablets and displayed publicly in the Forum around 450 BCE. They established legal equality under the law for plebeians.',
    tags: ['law', 'republic'],
  },
  {
    id: 'c-rome-2',
    deckId: 'deck-rome',
    question: 'What was the Pax Romana?',
    answer:
      "A roughly 200-year period of relative peace and stability within the Roman Empire (27 BCE – 180 CE), beginning with Augustus' reign. Trade flourished and Roman engineering expanded across Europe and North Africa.",
    tags: ['empire', 'politics'],
  },
  {
    id: 'c-rome-3',
    deckId: 'deck-rome',
    question: 'What was the role of the Roman Senate?',
    answer:
      'An advisory body of elected magistrates and patrician elders that held significant power over legislation, finance, and foreign policy. During the Republic it was the dominant governing institution; its power waned under the Empire.',
    tags: ['government', 'republic'],
  },
  {
    id: 'c-rome-4',
    deckId: 'deck-rome',
    question: 'What caused the fall of the Western Roman Empire?',
    answer:
      'A combination of military pressure from Germanic tribes, economic instability, overextension, political corruption, and the Hunnic invasions. The last Western emperor, Romulus Augustulus, was deposed in 476 CE.',
    tags: ['fall', 'empire'],
  },
  {
    id: 'c-rome-5',
    deckId: 'deck-rome',
    question: 'What was the significance of the Battle of Actium (31 BCE)?',
    answer:
      "Octavian's naval defeat of Antony and Cleopatra ended Rome's civil wars and led to Egypt's annexation. It marked the effective end of the Roman Republic and began the Principate — the first phase of the Roman Empire.",
    tags: ['military', 'transition'],
  },
]
