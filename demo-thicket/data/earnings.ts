export type TimePeriod = "7days" | "30days" | "90days" | "year" | "all"

export interface CourseEarning {
  course_id: number
  course_title: string
  enrolled_students: number
  total_revenue: number
  average_revenue_per_student: number
  last_transaction_date: string | null
}

export interface MonthlyEarning {
  month: string
  year: number
  revenue: number
  enrollments: number
}

export interface Transaction {
  id: number
  date: string
  course_id: number
  course_title: string
  student_name: string
  amount: number
  status: "succeeded" | "pending" | "failed" | "refunded"
  payment_intent_id: string
  charge_id: string | null
  receipt_url: string | null
  payment_method_type: string
  stripe_created: number
  customer_id: string | null
  refunded: boolean
  amount_refunded: number
}

export interface EarningsData {
  total_lifetime: number
  current_month: number
  pending_payouts: number
  next_payout_date: string
  course_earnings: CourseEarning[]
  monthly_breakdown: MonthlyEarning[]
  transactions: Transaction[]
}

export const EARNINGS_DATA: EarningsData = {
  total_lifetime: 15750,
  current_month: 2450,
  pending_payouts: 1200,
  next_payout_date: "2025-11-15T00:00:00.000Z",
  course_earnings: [
    {
      course_id: 1,
      course_title: "Renaissance Architecture: From Florence to Rome",
      enrolled_students: 47,
      total_revenue: 5875,
      average_revenue_per_student: 125,
      last_transaction_date: "2025-11-04T10:30:00.000Z",
    },
    {
      course_id: 2,
      course_title: "Modernist Masters: Bauhaus to Brutalism",
      enrolled_students: 32,
      total_revenue: 4000,
      average_revenue_per_student: 125,
      last_transaction_date: "2025-11-02T09:20:00.000Z",
    },
    {
      course_id: 3,
      course_title: "Gothic Cathedrals: Engineering Heaven on Earth",
      enrolled_students: 28,
      total_revenue: 3500,
      average_revenue_per_student: 125,
      last_transaction_date: "2025-10-31T11:30:00.000Z",
    },
    {
      course_id: 4,
      course_title: "Islamic Architecture: Geometry and Light",
      enrolled_students: 18,
      total_revenue: 2250,
      average_revenue_per_student: 125,
      last_transaction_date: "2025-10-27T15:30:00.000Z",
    },
    {
      course_id: 5,
      course_title: "Impressionism: Capturing Light and Moment",
      enrolled_students: 1,
      total_revenue: 125,
      average_revenue_per_student: 125,
      last_transaction_date: "2025-10-24T11:00:00.000Z",
    },
  ],
  monthly_breakdown: [
    { month: "January", year: 2025, revenue: 1200, enrollments: 12 },
    { month: "February", year: 2025, revenue: 1350, enrollments: 14 },
    { month: "March", year: 2025, revenue: 1100, enrollments: 11 },
    { month: "April", year: 2025, revenue: 1450, enrollments: 15 },
    { month: "May", year: 2025, revenue: 1600, enrollments: 17 },
    { month: "June", year: 2025, revenue: 1250, enrollments: 13 },
    { month: "July", year: 2025, revenue: 1400, enrollments: 14 },
    { month: "August", year: 2025, revenue: 1850, enrollments: 19 },
    { month: "September", year: 2025, revenue: 1750, enrollments: 18 },
    { month: "October", year: 2025, revenue: 2100, enrollments: 22 },
    { month: "November", year: 2025, revenue: 2450, enrollments: 25 },
    { month: "December", year: 2025, revenue: 0, enrollments: 0 },
  ],
  transactions: [
    {
      id: 1,
      date: "2025-11-04T10:30:00.000Z",
      course_id: 1,
      course_title: "Renaissance Architecture: From Florence to Rome",
      student_name: "Emily Rodriguez",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QKLm2BxQg8EvaM80Y8YNVCr",
      charge_id: "ch_3QKLm2BxQg8EvaM80MqPHj5v",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhC",
      payment_method_type: "card",
      stripe_created: 1730717400,
      customer_id: "cus_R1A2B3C4D5E6F7",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 2,
      date: "2025-11-03T14:15:00.000Z",
      course_id: 1,
      course_title: "Renaissance Architecture: From Florence to Rome",
      student_name: "Michael Chen",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QJNp1BxQg8EvaM81X7XMTBq",
      charge_id: "ch_3QJNp1BxQg8EvaM81LpNGi4u",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhD",
      payment_method_type: "card",
      stripe_created: 1730644500,
      customer_id: "cus_R2B3C4D5E6F7G8",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 3,
      date: "2025-11-02T09:20:00.000Z",
      course_id: 2,
      course_title: "Modernist Masters: Bauhaus to Brutalism",
      student_name: "Sarah Johnson",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QIOq0BxQg8EvaM82W6WLSAp",
      charge_id: "ch_3QIOq0BxQg8EvaM82KoMFh3t",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhE",
      payment_method_type: "card",
      stripe_created: 1730540400,
      customer_id: "cus_R3C4D5E6F7G8H9",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 4,
      date: "2025-11-01T16:45:00.000Z",
      course_id: 1,
      course_title: "Renaissance Architecture: From Florence to Rome",
      student_name: "James Wilson",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QHPp9BxQg8EvaM83V5VKRAo",
      charge_id: "ch_3QHPp9BxQg8EvaM83JnLEg2s",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhF",
      payment_method_type: "card",
      stripe_created: 1730481900,
      customer_id: "cus_R4D5E6F7G8H9I0",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 5,
      date: "2025-10-31T11:30:00.000Z",
      course_id: 3,
      course_title: "Gothic Cathedrals: Engineering Heaven on Earth",
      student_name: "Priya Patel",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QGQo8BxQg8EvaM84U4UJQZn",
      charge_id: "ch_3QGQo8BxQg8EvaM84ImKDf1r",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhG",
      payment_method_type: "card",
      stripe_created: 1730376600,
      customer_id: "cus_R5E6F7G8H9I0J1",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 6,
      date: "2025-10-30T08:15:00.000Z",
      course_id: 1,
      course_title: "Renaissance Architecture: From Florence to Rome",
      student_name: "David Kim",
      amount: 125,
      status: "pending",
      payment_intent_id: "pi_3QFRn7BxQg8EvaM85T3TIPYm",
      charge_id: null,
      receipt_url: null,
      payment_method_type: "card",
      stripe_created: 1730278500,
      customer_id: "cus_R6F7G8H9I0J1K2",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 7,
      date: "2025-10-29T13:50:00.000Z",
      course_id: 2,
      course_title: "Modernist Masters: Bauhaus to Brutalism",
      student_name: "Olivia Martinez",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QESm6BxQg8EvaM86S2SHOXl",
      charge_id: "ch_3QESm6BxQg8EvaM86HlJCe0q",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhH",
      payment_method_type: "card",
      stripe_created: 1730211000,
      customer_id: "cus_R7G8H9I0J1K2L3",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 8,
      date: "2025-10-28T10:00:00.000Z",
      course_id: 1,
      course_title: "Renaissance Architecture: From Florence to Rome",
      student_name: "Lucas Anderson",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QDTl5BxQg8EvaM87R1RGNWk",
      charge_id: "ch_3QDTl5BxQg8EvaM87GkIBd9p",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhI",
      payment_method_type: "card",
      stripe_created: 1730110800,
      customer_id: "cus_R8H9I0J1K2L3M4",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 9,
      date: "2025-10-27T15:30:00.000Z",
      course_id: 4,
      course_title: "Islamic Architecture: Geometry and Light",
      student_name: "Sophia Lee",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QCUk4BxQg8EvaM88Q0QFMVj",
      charge_id: "ch_3QCUk4BxQg8EvaM88FjHAc8o",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhJ",
      payment_method_type: "card",
      stripe_created: 1730044200,
      customer_id: "cus_R9I0J1K2L3M4N5",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 10,
      date: "2025-10-26T09:45:00.000Z",
      course_id: 3,
      course_title: "Gothic Cathedrals: Engineering Heaven on Earth",
      student_name: "Nathan Brown",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3QBVj3BxQg8EvaM89P9PELUi",
      charge_id: "ch_3QBVj3BxQg8EvaM89EiG9b7n",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhK",
      payment_method_type: "card",
      stripe_created: 1729934700,
      customer_id: "cus_R0J1K2L3M4N5O6",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 11,
      date: "2025-10-25T14:20:00.000Z",
      course_id: 1,
      course_title: "Renaissance Architecture: From Florence to Rome",
      student_name: "Emma Davis",
      amount: 125,
      status: "pending",
      payment_intent_id: "pi_3QAWi2BxQg8EvaM90O8ODKTh",
      charge_id: null,
      receipt_url: null,
      payment_method_type: "card",
      stripe_created: 1729865100,
      customer_id: "cus_RA1K2L3M4N5O6P7",
      refunded: false,
      amount_refunded: 0,
    },
    {
      id: 12,
      date: "2025-10-24T11:00:00.000Z",
      course_id: 2,
      course_title: "Modernist Masters: Bauhaus to Brutalism",
      student_name: "Liam Garcia",
      amount: 125,
      status: "succeeded",
      payment_intent_id: "pi_3Q9Xh1BxQg8EvaM91N7NCJSg",
      charge_id: "ch_3Q9Xh1BxQg8EvaM91DhF8a6m",
      receipt_url: "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUDB4S0JJQkN4UWc4RXZhTSIhL",
      payment_method_type: "card",
      stripe_created: 1729765200,
      customer_id: "cus_RB2L3M4N5O6P7Q8",
      refunded: false,
      amount_refunded: 0,
    },
  ],
}

export function filterEarningsByPeriod(
  data: EarningsData,
  period: TimePeriod
): EarningsData {
  const now = new Date("2025-11-04T00:00:00.000Z")
  let cutoffDate: Date

  switch (period) {
    case "7days":
      cutoffDate = new Date(now)
      cutoffDate.setDate(now.getDate() - 7)
      break
    case "30days":
      cutoffDate = new Date(now)
      cutoffDate.setDate(now.getDate() - 30)
      break
    case "90days":
      cutoffDate = new Date(now)
      cutoffDate.setDate(now.getDate() - 90)
      break
    case "year":
      cutoffDate = new Date(now)
      cutoffDate.setFullYear(now.getFullYear() - 1)
      break
    case "all":
    default:
      return data
  }

  const filteredTransactions = data.transactions.filter(
    (t) => new Date(t.date) >= cutoffDate
  )

  const filteredMonthly = data.monthly_breakdown.filter((m) => {
    const monthDate = new Date(`${m.month} 1, ${m.year}`)
    return monthDate >= cutoffDate
  })

  const periodRevenue = filteredTransactions.reduce(
    (sum, t) => sum + (t.status === "succeeded" ? t.amount : 0),
    0
  )

  return {
    ...data,
    total_lifetime: periodRevenue,
    monthly_breakdown: filteredMonthly,
    transactions: filteredTransactions,
  }
}
