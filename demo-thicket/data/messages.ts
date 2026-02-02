export type ConversationType = "teacher_to_student" | "student_to_teacher" | "student_to_student" | "course_announcement"

export interface Message {
  id: number
  thread_id: number
  sender_id: number
  sender_type: "teacher" | "student"
  recipient_id: number | string
  recipient_type: "teacher" | "student" | "group"
  subject: string
  body: string
  timestamp: string
  is_read: boolean
  conversation_type: ConversationType
  parent_message_id: number | null
  course_id: number | null
  announcement_id?: string
  recipient_ids?: number[]
}

export interface MessageThread {
  id: number
  subject: string
  participants: {
    id: number
    name: string
    type: "teacher" | "student"
    avatar_url: string
  }[]
  last_message: string
  last_message_timestamp: string
  unread_count: number
  conversation_type: ConversationType
  messages: Message[]
  course_id: number | null
  course_name: string | null
  announcement_id?: string
  recipient_count?: number
}

export const MESSAGES: Message[] = [
  {
    id: 1,
    thread_id: 1,
    sender_id: 1,
    sender_type: "student",
    recipient_id: 2,
    recipient_type: "teacher",
    subject: "Question about Renaissance Architecture assignment",
    body: "Hi Professor Chen, I have a question about the assignment on Brunelleschi's dome. Could you clarify what you mean by 'engineering innovations'? Should I focus on the construction techniques or the materials used?",
    timestamp: "2025-11-03T10:30:00.000Z",
    is_read: false,
    conversation_type: "student_to_teacher",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 2,
    thread_id: 1,
    sender_id: 2,
    sender_type: "teacher",
    recipient_id: 1,
    recipient_type: "student",
    subject: "Re: Question about Renaissance Architecture assignment",
    body: "Hi Emily, great question! Focus on both aspects - the construction techniques like the herringbone brick pattern and double-shell design, as well as the innovative use of materials. I'll share some additional resources in class tomorrow.",
    timestamp: "2025-11-03T14:15:00.000Z",
    is_read: true,
    conversation_type: "teacher_to_student",
    parent_message_id: 1,
    course_id: 1,
  },
  {
    id: 3,
    thread_id: 2,
    sender_id: 6,
    sender_type: "student",
    recipient_id: 2,
    recipient_type: "teacher",
    subject: "Request for assignment extension",
    body: "Dear Professor, I'm writing to request a short extension on this week's assignment. I've been dealing with a family emergency and fell behind. Would it be possible to submit by Friday instead of Wednesday?",
    timestamp: "2025-11-02T09:00:00.000Z",
    is_read: false,
    conversation_type: "student_to_teacher",
    parent_message_id: null,
    course_id: 2,
  },
  {
    id: 4,
    thread_id: 3,
    sender_id: 2,
    sender_type: "teacher",
    recipient_id: 4,
    recipient_type: "student",
    subject: "Congratulations on completing the course!",
    body: "James, congratulations on completing Renaissance Architecture with an excellent final project! Your analysis of Alberti's facade design was particularly insightful. I'd love to write you a recommendation if you need one. Best wishes for your continued studies!",
    timestamp: "2025-11-01T16:45:00.000Z",
    is_read: true,
    conversation_type: "teacher_to_student",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 5,
    thread_id: 3,
    sender_id: 4,
    sender_type: "student",
    recipient_id: 2,
    recipient_type: "teacher",
    subject: "Re: Congratulations on completing the course!",
    body: "Thank you so much, Professor Chen! This course was one of the most engaging I've taken. I would really appreciate a recommendation - I'm applying to graduate programs in architectural history. I'll send you the details via email.",
    timestamp: "2025-11-02T08:30:00.000Z",
    is_read: true,
    conversation_type: "student_to_teacher",
    parent_message_id: 4,
    course_id: 1,
  },
  {
    id: 6,
    thread_id: 4,
    sender_id: 7,
    sender_type: "student",
    recipient_id: 2,
    recipient_type: "teacher",
    subject: "Clarification on Week 5 reading",
    body: "Hi Professor, I'm a bit confused about the reading on Bramante's Tempietto. The text mentions it was built on the supposed site of St. Peter's martyrdom, but I thought St. Peter's Basilica was the actual site? Could you help clarify this?",
    timestamp: "2025-10-31T11:20:00.000Z",
    is_read: false,
    conversation_type: "student_to_teacher",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 7,
    thread_id: 5,
    sender_id: 3,
    sender_type: "student",
    recipient_id: 2,
    recipient_type: "teacher",
    subject: "Additional resources for exam prep",
    body: "Dear Professor Chen, with the midterm coming up, I was wondering if you could recommend any additional resources for studying? I want to make sure I have a strong grasp of the material, especially the section on architectural theory.",
    timestamp: "2025-10-30T14:00:00.000Z",
    is_read: true,
    conversation_type: "student_to_teacher",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 8,
    thread_id: 5,
    sender_id: 2,
    sender_type: "teacher",
    recipient_id: 3,
    recipient_type: "student",
    subject: "Re: Additional resources for exam prep",
    body: "Hi Sarah, I'm glad you're being proactive! I recommend reviewing Alberti's treatise excerpts from the course reader and the online lecture recordings. I've also posted a study guide with key terms and concepts on the course page. Feel free to come to office hours if you have specific questions!",
    timestamp: "2025-10-30T18:30:00.000Z",
    is_read: true,
    conversation_type: "teacher_to_student",
    parent_message_id: 7,
    course_id: 1,
  },
  {
    id: 9,
    thread_id: 6,
    sender_id: 5,
    sender_type: "student",
    recipient_id: 2,
    recipient_type: "teacher",
    subject: "Thank you for the feedback",
    body: "Hi Professor, I just wanted to say thank you for the detailed feedback on my paper about Florence's urban design. Your comments really helped me understand how to better structure my arguments. I'm excited to apply this to the next assignment!",
    timestamp: "2025-10-29T13:15:00.000Z",
    is_read: true,
    conversation_type: "student_to_teacher",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 10,
    thread_id: 7,
    sender_id: 8,
    sender_type: "student",
    recipient_id: 2,
    recipient_type: "teacher",
    subject: "Attendance question",
    body: "Hello Professor, I'm going to be out of town next week for a family wedding. Will the lecture be recorded so I can catch up on the material? I don't want to fall behind.",
    timestamp: "2025-10-28T10:00:00.000Z",
    is_read: true,
    conversation_type: "student_to_teacher",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 11,
    thread_id: 7,
    sender_id: 2,
    sender_type: "teacher",
    recipient_id: 8,
    recipient_type: "student",
    subject: "Re: Attendance question",
    body: "Hi Lucas, yes, all lectures are recorded and posted within 24 hours. You'll find them in the course materials section. Have a great time at the wedding, and don't hesitate to reach out if you have questions about the material when you catch up!",
    timestamp: "2025-10-28T15:45:00.000Z",
    is_read: true,
    conversation_type: "teacher_to_student",
    parent_message_id: 10,
    course_id: 1,
  },
  {
    id: 12,
    thread_id: 8,
    sender_id: 1,
    sender_type: "student",
    recipient_id: 3,
    recipient_type: "student",
    subject: "Study group for Renaissance Architecture?",
    body: "Hey Sarah! I noticed we're both taking Renaissance Architecture. Would you be interested in forming a study group? I think it would be helpful to discuss the material together, especially with the midterm coming up.",
    timestamp: "2025-11-04T11:00:00.000Z",
    is_read: false,
    conversation_type: "student_to_student",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 13,
    thread_id: 8,
    sender_id: 3,
    sender_type: "student",
    recipient_id: 1,
    recipient_type: "student",
    subject: "Re: Study group for Renaissance Architecture?",
    body: "Hi Emily! That sounds great! I'd love to join a study group. We could meet once a week to review the readings and quiz each other. What times work best for you?",
    timestamp: "2025-11-04T13:30:00.000Z",
    is_read: true,
    conversation_type: "student_to_student",
    parent_message_id: 12,
    course_id: 1,
  },
  {
    id: 14,
    thread_id: 9,
    sender_id: 1,
    sender_type: "student",
    recipient_id: 7,
    recipient_type: "student",
    subject: "Question about the assignment",
    body: "Hi Olivia, I saw your presentation last week and it was really impressive! I'm working on a similar topic and was wondering if you could share some of your research sources? No worries if not!",
    timestamp: "2025-11-03T16:20:00.000Z",
    is_read: true,
    conversation_type: "student_to_student",
    parent_message_id: null,
    course_id: 1,
  },
  {
    id: 15,
    thread_id: 9,
    sender_id: 7,
    sender_type: "student",
    recipient_id: 1,
    recipient_type: "student",
    subject: "Re: Question about the assignment",
    body: "Hi Emily! Thanks so much! I'd be happy to share. I found some great resources in the university library's digital archive. I'll send you a list of the books and articles I used. Good luck with your assignment!",
    timestamp: "2025-11-03T18:45:00.000Z",
    is_read: true,
    conversation_type: "student_to_student",
    parent_message_id: 14,
    course_id: 1,
  },
  {
    id: 16,
    thread_id: 10,
    sender_id: 4,
    sender_type: "student",
    recipient_id: 1,
    recipient_type: "student",
    subject: "Gothic Cathedrals course recommendation",
    body: "Hey Emily! I finished Renaissance Architecture last month and loved it. I see you're enrolled in Gothic Cathedrals too. It's an amazing course - Professor Anderson is fantastic. Let me know if you need any tips!",
    timestamp: "2025-11-02T10:15:00.000Z",
    is_read: true,
    conversation_type: "student_to_student",
    parent_message_id: null,
    course_id: 3,
  },
  {
    id: 17,
    thread_id: 11,
    sender_id: 2,
    sender_type: "teacher",
    recipient_id: "group",
    recipient_type: "group",
    subject: "Week 4 Assignment Deadline Extended",
    body: "Dear students, Due to the upcoming holiday, I'm extending the Week 4 assignment deadline by three days. The new deadline is Friday, November 15th at 11:59 PM. This should give everyone ample time to complete the analysis of Palladio's architectural principles. Remember to cite your sources properly and include visual examples in your submission. If you have any questions, please don't hesitate to reach out during office hours or via message.",
    timestamp: "2025-11-10T09:00:00.000Z",
    is_read: false,
    conversation_type: "course_announcement",
    parent_message_id: null,
    course_id: 1,
    announcement_id: "ann_20251110_1",
    recipient_ids: [1, 3, 5, 7],
  },
  {
    id: 21,
    thread_id: 15,
    sender_id: 2,
    sender_type: "teacher",
    recipient_id: "group",
    recipient_type: "group",
    subject: "New Resource: Virtual Tour of Renaissance Buildings",
    body: "Hello everyone! I've added an exciting new resource to our course materials - a comprehensive virtual tour collection of Renaissance buildings we've been studying. You can now explore the Duomo in Florence, St. Peter's Basilica, and the Villa Rotonda from the comfort of your home. These 360-degree tours include detailed annotations explaining the architectural features we've discussed in class. I highly recommend exploring these before our next live session. The links are available in the Resources tab.",
    timestamp: "2025-11-08T14:30:00.000Z",
    is_read: true,
    conversation_type: "course_announcement",
    parent_message_id: null,
    course_id: 1,
    announcement_id: "ann_20251108_1",
    recipient_ids: [1, 3],
  },
  {
    id: 23,
    thread_id: 17,
    sender_id: 2,
    sender_type: "teacher",
    recipient_id: "group",
    recipient_type: "group",
    subject: "Midterm Exam Preparation Guide Available",
    body: "Dear students, The midterm exam preparation guide is now available in the course resources. It covers all material from weeks 1-5 and includes sample questions, key concepts, and recommended readings. The exam will take place during our live session on November 20th. Please review the study guide thoroughly and come prepared with any questions. I'll be holding two additional office hours next week specifically for exam prep - check the schedule for times. Good luck with your preparation!",
    timestamp: "2025-11-07T10:00:00.000Z",
    is_read: true,
    conversation_type: "course_announcement",
    parent_message_id: null,
    course_id: 2,
    announcement_id: "ann_20251107_2",
    recipient_ids: [6, 8],
  },
  {
    id: 25,
    thread_id: 19,
    sender_id: 9,
    sender_type: "teacher",
    recipient_id: 1,
    recipient_type: "student",
    subject: "Guest Lecture: Master Gothic Stonemason Next Week",
    body: "Exciting news! We have a special guest joining us next week - Master Stonemason Jean-Pierre Laurent, who has worked on the restoration of Notre-Dame and Chartres Cathedral. He'll be sharing insights into medieval construction techniques and the challenges of modern cathedral restoration. This is a rare opportunity to learn from a practicing craftsman who works with centuries-old methods. Attendance is highly encouraged, and there will be time for Q&A at the end. See you there!",
    timestamp: "2025-11-06T16:00:00.000Z",
    is_read: true,
    conversation_type: "course_announcement",
    parent_message_id: null,
    course_id: 3,
  },
]

export const MESSAGE_THREADS: MessageThread[] = [
  {
    id: 1,
    subject: "Question about Renaissance Architecture assignment",
    participants: [
      {
        id: 1,
        name: "Emily Rodriguez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hi Emily, great question! Focus on both aspects - the construction techniques...",
    last_message_timestamp: "2025-11-03T14:15:00.000Z",
    unread_count: 0,
    conversation_type: "student_to_teacher",
    messages: MESSAGES.filter((m) => m.thread_id === 1),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 2,
    subject: "Request for assignment extension",
    participants: [
      {
        id: 6,
        name: "David Kim",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Dear Professor, I'm writing to request a short extension on this week's assignment...",
    last_message_timestamp: "2025-11-02T09:00:00.000Z",
    unread_count: 1,
    conversation_type: "student_to_teacher",
    messages: MESSAGES.filter((m) => m.thread_id === 2),
    course_id: 2,
    course_name: "Modernist Masters: Bauhaus to Brutalism",
  },
  {
    id: 3,
    subject: "Congratulations on completing the course!",
    participants: [
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 4,
        name: "James Wilson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Thank you so much, Professor Chen! This course was one of the most engaging...",
    last_message_timestamp: "2025-11-02T08:30:00.000Z",
    unread_count: 0,
    conversation_type: "teacher_to_student",
    messages: MESSAGES.filter((m) => m.thread_id === 3),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 4,
    subject: "Clarification on Week 5 reading",
    participants: [
      {
        id: 7,
        name: "Olivia Martinez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hi Professor, I'm a bit confused about the reading on Bramante's Tempietto...",
    last_message_timestamp: "2025-10-31T11:20:00.000Z",
    unread_count: 1,
    conversation_type: "student_to_teacher",
    messages: MESSAGES.filter((m) => m.thread_id === 4),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 5,
    subject: "Additional resources for exam prep",
    participants: [
      {
        id: 3,
        name: "Sarah Johnson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hi Sarah, I'm glad you're being proactive! I recommend reviewing Alberti's treatise excerpts...",
    last_message_timestamp: "2025-10-30T18:30:00.000Z",
    unread_count: 0,
    conversation_type: "student_to_teacher",
    messages: MESSAGES.filter((m) => m.thread_id === 5),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 6,
    subject: "Thank you for the feedback",
    participants: [
      {
        id: 5,
        name: "Priya Patel",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hi Professor, I just wanted to say thank you for the detailed feedback on my paper...",
    last_message_timestamp: "2025-10-29T13:15:00.000Z",
    unread_count: 0,
    conversation_type: "student_to_teacher",
    messages: MESSAGES.filter((m) => m.thread_id === 6),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 7,
    subject: "Attendance question",
    participants: [
      {
        id: 8,
        name: "Lucas Anderson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hi Lucas, yes, all lectures are recorded and posted within 24 hours...",
    last_message_timestamp: "2025-10-28T15:45:00.000Z",
    unread_count: 0,
    conversation_type: "teacher_to_student",
    messages: MESSAGES.filter((m) => m.thread_id === 7),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 8,
    subject: "Study group for Renaissance Architecture?",
    participants: [
      {
        id: 1,
        name: "Emily Rodriguez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 3,
        name: "Sarah Johnson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hi Emily! That sounds great! I'd love to join a study group...",
    last_message_timestamp: "2025-11-04T13:30:00.000Z",
    unread_count: 1,
    conversation_type: "student_to_student",
    messages: MESSAGES.filter((m) => m.thread_id === 8),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 9,
    subject: "Question about the assignment",
    participants: [
      {
        id: 1,
        name: "Emily Rodriguez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 7,
        name: "Olivia Martinez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hi Emily! Thanks so much! I'd be happy to share. I found some great resources...",
    last_message_timestamp: "2025-11-03T18:45:00.000Z",
    unread_count: 0,
    conversation_type: "student_to_student",
    messages: MESSAGES.filter((m) => m.thread_id === 9),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
  },
  {
    id: 10,
    subject: "Gothic Cathedrals course recommendation",
    participants: [
      {
        id: 4,
        name: "James Wilson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 1,
        name: "Emily Rodriguez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hey Emily! I finished Renaissance Architecture last month and loved it...",
    last_message_timestamp: "2025-11-02T10:15:00.000Z",
    unread_count: 0,
    conversation_type: "student_to_student",
    messages: MESSAGES.filter((m) => m.thread_id === 10),
    course_id: 3,
    course_name: "Gothic Cathedrals: Engineering Heaven on Earth",
  },
  {
    id: 11,
    subject: "Week 4 Assignment Deadline Extended",
    participants: [
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 1,
        name: "Emily Rodriguez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 3,
        name: "Sarah Johnson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 5,
        name: "Priya Patel",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 7,
        name: "Olivia Martinez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Dear students, Due to the upcoming holiday, I'm extending the Week 4 assignment deadline by three days...",
    last_message_timestamp: "2025-11-10T09:00:00.000Z",
    unread_count: 2,
    conversation_type: "course_announcement",
    messages: MESSAGES.filter((m) => m.thread_id === 11),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
    announcement_id: "ann_20251110_1",
    recipient_count: 4,
  },
  {
    id: 15,
    subject: "New Resource: Virtual Tour of Renaissance Buildings",
    participants: [
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 1,
        name: "Emily Rodriguez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 3,
        name: "Sarah Johnson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Hello everyone! I've added an exciting new resource to our course materials - a comprehensive virtual tour collection...",
    last_message_timestamp: "2025-11-08T14:30:00.000Z",
    unread_count: 0,
    conversation_type: "course_announcement",
    messages: MESSAGES.filter((m) => m.thread_id === 15),
    course_id: 1,
    course_name: "Renaissance Architecture: From Florence to Rome",
    announcement_id: "ann_20251108_1",
    recipient_count: 2,
  },
  {
    id: 17,
    subject: "Midterm Exam Preparation Guide Available",
    participants: [
      {
        id: 2,
        name: "Sarah Chen",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 6,
        name: "David Kim",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 8,
        name: "Lucas Anderson",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Dear students, The midterm exam preparation guide is now available in the course resources...",
    last_message_timestamp: "2025-11-07T10:00:00.000Z",
    unread_count: 1,
    conversation_type: "course_announcement",
    messages: MESSAGES.filter((m) => m.thread_id === 17),
    course_id: 2,
    course_name: "Modernist Masters: Bauhaus to Brutalism",
    announcement_id: "ann_20251107_2",
    recipient_count: 2,
  },
  {
    id: 19,
    subject: "Guest Lecture: Master Gothic Stonemason Next Week",
    participants: [
      {
        id: 9,
        name: "Prof. Michael Anderson",
        type: "teacher",
        avatar_url:
          "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
      {
        id: 1,
        name: "Emily Rodriguez",
        type: "student",
        avatar_url:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
      },
    ],
    last_message:
      "Exciting news! We have a special guest joining us next week - Master Stonemason Jean-Pierre Laurent...",
    last_message_timestamp: "2025-11-06T16:00:00.000Z",
    unread_count: 0,
    conversation_type: "course_announcement",
    messages: MESSAGES.filter((m) => m.thread_id === 19),
    course_id: 3,
    course_name: "Gothic Cathedrals: Engineering Heaven on Earth",
  },
]

export function getUnreadMessageCount(teacherId: number): number {
  return MESSAGE_THREADS.filter(
    (thread) =>
      thread.unread_count > 0 &&
      thread.participants.some((p) => p.id === teacherId && p.type === "teacher")
  ).reduce((sum, thread) => sum + thread.unread_count, 0)
}

export function getStudentThreads(studentId: number): MessageThread[] {
  return MESSAGE_THREADS.filter((thread) =>
    thread.participants.some((p) => p.id === studentId && p.type === "student")
  )
}

export function getUnreadStudentMessageCount(studentId: number): number {
  return MESSAGE_THREADS.filter(
    (thread) =>
      thread.unread_count > 0 &&
      thread.participants.some((p) => p.id === studentId && p.type === "student")
  ).reduce((sum, thread) => sum + thread.unread_count, 0)
}

export function getTeacherThreads(teacherId: number): MessageThread[] {
  return MESSAGE_THREADS.filter((thread) =>
    thread.participants.some((p) => p.id === teacherId && p.type === "teacher")
  )
}

export function getThreadsByCourse(threads: MessageThread[], courseId: number): MessageThread[] {
  return threads.filter((thread) => thread.course_id === courseId)
}

export function getUniqueCoursesFromThreads(threads: MessageThread[]): { id: number; name: string }[] {
  const coursesMap = new Map<number, string>()

  threads.forEach((thread) => {
    if (thread.course_id && thread.course_name) {
      coursesMap.set(thread.course_id, thread.course_name)
    }
  })

  return Array.from(coursesMap.entries()).map(([id, name]) => ({ id, name }))
}

export function isAnnouncementMessage(message: Message): boolean {
  return message.conversation_type === "course_announcement"
}

export function isAnnouncementThread(thread: MessageThread): boolean {
  return thread.conversation_type === "course_announcement"
}

export function getCourseAnnouncements(courseId: number): MessageThread[] {
  return MESSAGE_THREADS.filter(
    (thread) => thread.course_id === courseId && isAnnouncementThread(thread)
  ).sort((a, b) => {
    return new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
  })
}

export function getLatestCourseAnnouncement(courseId: number): MessageThread | null {
  const announcements = getCourseAnnouncements(courseId)
  return announcements.length > 0 ? announcements[0] : null
}

export function getRecipientsForCourse(
  allRecipients: { id: number; name: string; type: "teacher" | "student"; avatar_url: string }[],
  courseId: number,
  threads: MessageThread[]
): { id: number; name: string; type: "teacher" | "student"; avatar_url: string }[] {
  const courseThreads = threads.filter((t) => t.course_id === courseId)
  const recipientIds = new Set<string>()

  courseThreads.forEach((thread) => {
    thread.participants.forEach((p) => {
      recipientIds.add(`${p.type}-${p.id}`)
    })
  })

  return allRecipients.filter((r) => recipientIds.has(`${r.type}-${r.id}`))
}
