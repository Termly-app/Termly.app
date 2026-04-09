/**
 * Utility to generate professional, human-sounding academic remarks.
 * Avoids robotic "AI-sounding" jargon in favor of standard pedagogical language.
 */

const PHRASE_BANK = {
  high: [ // 80-100
    "Produces work of an exceptional standard and demonstrates a deep understanding of core concepts.",
    "A very dedicated student who consistently strives for excellence in all classroom activities.",
    "Has an excellent grasp of the subject matter and contributes meaningfully to class discussions.",
    "Shows great initiative and a high level of critical thinking in their approach to learning.",
    "An outstanding performance; consistently produces high-quality work and shows great leadership."
  ],
  good: [ // 65-79
    "Making consistent progress and is a conscientious student who is attentive in class.",
    "Has a solid grasp of most concepts and is applying themselves well to the curriculum.",
    "A hardworking student who shows a positive attitude and a willingness to improve.",
    "Regularly achieves good results and is beginning to develop more confidence in this subject.",
    "Maintains a good standard of work and participates well in group activities."
  ],
  average: [ // 50-64
    "A capable student who is making steady progress but needs to focus more on detail.",
    "Shows a satisfactory understanding of the basics; encouraged to participate more actively.",
    "Is making an effort and is capable of achieving higher results with more consistent revision.",
    "Beginning to develop proficiency; recommended to seek additional support for more complex topics.",
    "A conscientious student whose results would improve with more regular study habits."
  ],
  below: [ // < 50
    "Finding some aspects of the subject challenging and would benefit from extra support at home.",
    "Encouraged to focus more on completing assignments and participating in classroom discussions.",
    "Revision of core concepts is highly recommended to build a stronger foundation in this area.",
    "Needs to strive for more consistency in their work habits to achieve better results.",
    "Would benefit from a more focused approach to their studies and regular attendance at extra help sessions."
  ]
};

/**
 * Generates a professional remark based on a student's score.
 * @param {number} score - The mark (0-100).
 * @param {string} studentId - Used as a seed for consistent randomness (so same student gets same remark).
 * @returns {string} - A human-sounding remark.
 */
export function getProfessionalRemark(score, studentId = 'default') {
  let category = 'average';
  if (score >= 80) category = 'high';
  else if (score >= 65) category = 'good';
  else if (score >= 50) category = 'average';
  else category = 'below';

  const phrases = PHRASE_BANK[category];
  
  // Use a simple hash of studentId to pick a phrase consistently
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = ((hash << 5) - hash) + studentId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % phrases.length;
  
  return phrases[index];
}
