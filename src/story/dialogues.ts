import type { Conversation } from './dialogue';

/**
 * Conversations of Willowbrook Village.
 * Each villager picks a different first line depending on what they remember.
 */

const SLIMES_FOR_FATHER = 3;

const mother: Conversation = {
  npc: 'mother',
  name: 'Mother',
  start: (m) => {
    if (!m.has('motherMet')) return 'first';
    if (m.counters.fainted > m.num('motherFaintsSeen')) return 'fainted';
    if (m.has('toldMotherTruth')) return 'truthLater';
    return 'later';
  },
  nodes: {
    first: {
      text: 'There you are, little one. Staring at the sky again? Sometimes you look at me with such old eyes...',
      run: (m) => m.set('motherMet'),
      choices: [
        { text: 'I love you, Mama.', next: 'love', run: (m) => m.like('mother', 2) },
        { text: 'I was thinking about magic.', next: 'magic' },
        { text: 'Where do people go when they die?', next: 'death' },
      ],
    },
    love: {
      text: 'Oh! ...And I love you, more than all the stars. Come here, let me fix your collar.',
      run: (_m, api) => api.heal(),
    },
    magic: {
      text: 'Magic? At your age? Your father says the shrine by our door glows when you walk past it.',
      next: 'magic2',
    },
    magic2: {
      text: 'Go on, touch it if you like. But stay away from the meadows south of the road. Slimes live there.',
    },
    death: {
      text: '...What a question for a five-year-old. The priests say the soul travels on. Why do you ask?',
      choices: [
        { text: 'Just curious.', next: 'curious' },
        {
          text: 'I think I remember another life.',
          next: 'truth',
          run: (m) => m.set('toldMotherTruth'),
        },
      ],
    },
    curious: {
      text: 'Curious about everything, that is my child. Ask the Elder at the well, she loves such questions.',
    },
    truth: {
      text: '(She laughs. Then she stops.) ...You are not joking, are you?',
      next: 'truth2',
    },
    truth2: {
      text: 'We will talk about this when you are older. Until then, do not tell anyone. Promise me.',
    },
    fainted: {
      text: (m) =>
        m.counters.fainted === 1
          ? 'I carried you home from the meadow! You scared me half to death. Let me look at you...'
          : `I carried you home AGAIN. That makes ${m.counters.fainted} times! Please be careful, my heart cannot take it.`,
      run: (m, api) => {
        m.set('motherFaintsSeen', m.counters.fainted);
        api.heal();
      },
    },
    truthLater: {
      text: 'I keep thinking about what you said. Another life... Be careful who hears it, little one.',
      choices: [
        { text: "I'm hurt, Mama.", next: 'heal' },
        { text: 'I will be careful.' },
      ],
    },
    later: {
      text: (m) =>
        m.likes('mother') >= 2
          ? 'My sweet child. Supper is at sundown, do not be late.'
          : 'Supper is at sundown. Do not be late.',
      choices: [
        { text: "I'm hurt, Mama.", next: 'heal' },
        { text: 'Yes, Mama.' },
      ],
    },
    heal: {
      text: 'Let me see... There. A kiss and a clean bandage. All better.',
      run: (_m, api) => api.heal(),
    },
  },
};

const father: Conversation = {
  npc: 'father',
  name: 'Father',
  start: (m, f) => {
    const quest = m.get('slimeQuest');
    if (quest === 'done') return f.level >= 3 ? 'afterGrown' : 'after';
    if (quest === 'active') {
      const killed = m.counters.slimesKilled - m.num('slimeQuestBase');
      return killed >= SLIMES_FOR_FATHER ? 'reward' : 'progress';
    }
    return m.has('fatherMet') ? 'askAgain' : 'first';
  },
  nodes: {
    first: {
      text: 'Careful with the carrots, kid. Slimes keep creeping out of the south meadows to eat them.',
      run: (m) => m.set('fatherMet'),
      next: 'first2',
    },
    first2: {
      text: 'I would chase them off myself, but my back is not what it was.',
      choices: [
        { text: 'I will fight them!', next: 'accept' },
        { text: 'That sounds dangerous.', next: 'decline' },
      ],
    },
    askAgain: {
      text: 'Those slimes are still at my carrots. Changed your mind about helping your old man?',
      choices: [
        { text: 'I will fight them!', next: 'accept' },
        { text: 'Not yet.', next: 'decline' },
      ],
    },
    accept: {
      text: `With that wooden sword? Ha! Fine. Beat ${SLIMES_FOR_FATHER} of them and I will believe you are my child.`,
      run: (m) => {
        m.set('slimeQuest', 'active');
        m.set('slimeQuestBase', m.counters.slimesKilled);
        m.like('father', 1);
      },
    },
    decline: {
      text: 'Smart kid. Smarter than I was at your age.',
    },
    progress: {
      text: (m) => {
        const killed = m.counters.slimesKilled - m.num('slimeQuestBase');
        return killed === 0
          ? `Not a single slime yet? ${SLIMES_FOR_FATHER}, I said. They are south of the road.`
          : `${killed} so far. ${SLIMES_FOR_FATHER}, I said. Keep going!`;
      },
    },
    reward: {
      text: `${SLIMES_FOR_FATHER} slimes! I watched from the fence. You fight like someone who has done it before...`,
      next: 'reward2',
    },
    reward2: {
      text: 'Here. You earned this, little warrior.',
      run: (m, api) => {
        m.set('slimeQuest', 'done');
        m.like('father', 2);
        api.xp(30);
      },
    },
    after: {
      text: 'The carrots are safe, thanks to you. Do not tell your mother I sent you out there.',
    },
    afterGrown: {
      text: 'You are growing fast. Too fast, your mother says. I say: good.',
    },
  },
};

const elder: Conversation = {
  npc: 'elder',
  name: 'Elder Maren',
  start: (m, f) => {
    if (f.spells.length === 0) return 'noMagic';
    if (!m.has('elderSawMagic')) return 'sawMagic';
    if (f.spells.length >= 5 && !m.has('elderReward')) return 'allFive';
    if (m.has('elderReward')) return 'afterAll';
    return 'count';
  },
  nodes: {
    noMagic: {
      text: 'Hmm. A child with quiet eyes. Five shrines stand around this village, one for each element.',
      next: 'noMagic2',
    },
    noMagic2: {
      text: 'Most children feel nothing when they touch one. Try the one by your door, and come tell me.',
    },
    sawMagic: {
      text: 'I felt it from here. A shrine answered you... at five years old. I was nineteen.',
      run: (m) => m.set('elderSawMagic'),
      choices: [
        { text: 'Is that strange?', next: 'strange' },
        { text: 'I want to learn all five.', next: 'ambition', run: (m) => m.like('elder', 1) },
      ],
    },
    strange: {
      text: 'Strange? It is unheard of. Do not show it to travellers. Not everyone is kind to what they cannot explain.',
    },
    ambition: {
      text: 'Ambition. Good, and dangerous. Come back when all five have answered you.',
    },
    count: {
      text: (_m, f) => `${f.spells.length} of the five shrines have answered you. The others are waiting.`,
    },
    allFive: {
      text: 'All five. Fire, Water, Wind, Earth, Spirit. In eighty years I have never seen it.',
      next: 'allFive2',
    },
    allFive2: {
      text: 'There is a sixth, child. We do not say its name. One day it will find you. Until then, take this.',
      run: (m, api) => {
        m.set('elderReward');
        m.like('elder', 2);
        api.xp(50);
      },
    },
    afterAll: {
      text: 'Grow slowly, child. The world will ask much of you soon enough.',
    },
  },
};

const villager: Conversation = {
  npc: 'villager',
  name: 'Tobin the Peddler',
  start: (m) => {
    if (!m.has('tobinMet')) return 'first';
    if (m.has('tobinRude')) return 'rudeLater';
    if (m.likes('villager') > 0 && !m.has('tobinGift')) return 'gift';
    return m.likes('villager') > 0 ? 'kindLater' : 'neutralLater';
  },
  nodes: {
    first: {
      text: 'Oi, kid! Hands off the cart. Got any coin? No? Of course not, you are five.',
      run: (m) => m.set('tobinMet'),
      choices: [
        { text: 'You look tired. Are you okay?', next: 'kind', run: (m) => m.like('villager', 1) },
        {
          text: 'Your apples look rotten.',
          next: 'rude',
          run: (m) => {
            m.set('tobinRude');
            m.like('villager', -1);
          },
        },
        { text: 'Bye.' },
      ],
    },
    kind: {
      text: '...Huh. Nobody asks me that. The roads are bad, kid. Slimes all along the east road.',
    },
    rude: {
      text: 'Rotten?! These are the finest apples in Lunaris! ...Brat.',
    },
    rudeLater: {
      text: 'Oh. It is the apple critic.',
      choices: [
        {
          text: 'I am sorry about before.',
          next: 'forgive',
          run: (m) => {
            m.set('tobinRude', false);
            m.like('villager', 2);
          },
        },
        { text: 'They still look rotten.', next: 'goAway' },
      ],
    },
    forgive: {
      text: '...Fine. Apology accepted. Kids these days.',
    },
    goAway: {
      text: 'Go away.',
    },
    gift: {
      text: 'There is my favourite customer who never buys anything. Here, have an apple. On the house.',
      run: (m, api) => {
        m.set('tobinGift');
        api.heal();
      },
    },
    kindLater: {
      text: 'Stay off the east road until you are bigger, eh?',
    },
    neutralLater: {
      text: 'Still no coin? Come back when you are older.',
    },
  },
};

export const CONVERSATIONS: Record<string, Conversation> = { mother, father, elder, villager };
