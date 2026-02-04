/** AI Module — simulates vision model analysis + test generation.
 *
 * Each function here is an async boundary designed to be swapped with
 * a real API call (e.g. OpenAI Vision, Claude, Gemini).
 *
 * Input shape stays the same; replace the body with fetch() calls.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Step 1: Analyze screenshots + context ──────────────────────────
// In production: send images to a vision model to detect UI components,
// screen types, user flows, and potential test areas.
export async function analyzeScreenshots(screenshots, userContext) {
  // Simulate AI exploring the app — performing clicks, learning flows
  await delay(2000)

  const screens = screenshots.map((s) => {
    const label = (s.label || s.name || '').toLowerCase()
    const detected = detectScreenType(label)
    return { ...s, ...detected }
  })

  const hasAuth = screens.some((s) => s.screenType === 'auth')
  const hasForms = screens.some((s) => s.hasForm)
  const hasNavigation = screens.length > 1
  const hasMultiDevice = new Set(screenshots.map((s) => s.device)).size > 1
  const devices = [...new Set(screenshots.map((s) => s.device))]

  const summary = buildSummary(screens, userContext, devices)

  return {
    screens,
    devices,
    userContext,
    features: { hasAuth, hasForms, hasNavigation, hasMultiDevice },
    summary,
  }
}

// ── Step 2: Generate dynamic questions based on analysis ───────────
// These questions are contextual — they change depending on what
// the AI detected in the screenshots.
export function generateQuestions(analysis) {
  const { screens, features } = analysis
  const questions = []

  // Always ask testing scope
  questions.push({
    id: 'testTypes',
    question: `I've learned the flow across ${screens.length} screen${screens.length !== 1 ? 's' : ''}. What types of testing should I generate?`,
    multi: true,
    options: [
      'Visual Regression',
      'Cross-Browser',
      'Functional',
      'Accessibility',
      ...(features.hasAuth ? ['Security'] : []),
      ...(features.hasMultiDevice ? ['Responsive'] : []),
      ...(screens.length > 1 ? ['End-to-End Flow'] : []),
      'Edge Cases',
    ],
  })

  // Contextual: if forms detected, ask about validation
  if (features.hasForms) {
    const formScreens = screens.filter((s) => s.hasForm).map((s) => s.label || s.name)
    questions.push({
      id: 'formValidation',
      question: `I detected form inputs on: ${formScreens.join(', ')}. Which validation aspects should I focus on?`,
      multi: true,
      options: ['Required field indicators', 'Input masks and formatting', 'Inline error states', 'Boundary and edge values', 'Autofill and paste behavior'],
    })
  }

  // Contextual: if auth screens detected
  if (features.hasAuth) {
    questions.push({
      id: 'authFlow',
      question: 'I found authentication screens in the flow. Which auth scenarios should I test?',
      multi: true,
      options: ['Happy path login', 'Invalid credentials', 'Session expiry', 'OTP/2FA', 'Forgot password'],
    })
  }

  // Contextual: multi-device → ask about responsive/cross-browser focus
  if (features.hasMultiDevice) {
    questions.push({
      id: 'responsive',
      question: 'I see both mobile and desktop screens. What responsive aspects should I test?',
      multi: true,
      options: ['Layout shifts between breakpoints', 'Touch target sizing (44px min)', 'Viewport-specific element visibility', 'Font scaling and readability', 'Scroll behavior differences'],
    })
  }

  // Contextual: multi-screen → ask about flow priority
  if (features.hasNavigation) {
    questions.push({
      id: 'priority',
      question: 'I mapped the complete flow. Which parts are highest priority for testing?',
      multi: false,
      options: ['Critical user journeys only', 'All screens equally', 'High-traffic entry points', 'Screens with most interactions'],
    })
  }

  return questions
}

// ── Step 3: Generate test cases from analysis + answers ────────────
// In production: send analysis + answers to LLM to generate detailed,
// contextual test cases.
export async function generateTestCases(analysis, answers) {
  await delay(1500)

  const { screens, features } = analysis
  const testTypes = getAnswer(answers, 'testTypes') || ['Functional']
  const priority = (getAnswer(answers, 'priority') || ['All screens equally'])[0]
  const formValidation = getAnswer(answers, 'formValidation') || []
  const authScenarios = getAnswer(answers, 'authFlow') || []
  const responsiveFocus = getAnswer(answers, 'responsive') || []

  const testCases = []
  let idx = 1

  for (const screen of screens) {
    for (const type of testTypes) {
      const tc = buildTestCase(idx++, screen, type, {
        priority,
        formValidation,
        authScenarios,
        responsiveFocus,
        features,
      })
      testCases.push(tc)
    }
  }

  // Add cross-screen flow tests if End-to-End selected
  if (testTypes.includes('End-to-End Flow') && screens.length > 1) {
    testCases.push({
      id: `TC-${String(idx++).padStart(3, '0')}`,
      name: 'Complete user flow across all screens',
      device: screens[0].device,
      type: 'E2E',
      priority: 'high',
      preconditions: 'User starts from the first screen in the flow',
      steps: screens.map((s, i) =>
        `Step ${i + 1}: Navigate to and interact with ${s.label || s.name}`
      ),
      expected: 'User completes the entire flow without errors, all transitions are smooth',
    })
  }

  // Add auth-specific tests
  if (authScenarios.length > 0) {
    const authScreen = screens.find((s) => s.screenType === 'auth') || screens[0]
    for (const scenario of authScenarios) {
      testCases.push(buildAuthTest(idx++, authScreen, scenario))
    }
  }

  return testCases
}

// ── Helpers ─────────────────────────────────────────────────────────

// Full known flow for the home loan app (in order)
const KNOWN_FLOW = [
  'landing page',
  'phone number input screen',
  'otp verification screen',
  'accept consent screen',
  'home screen',
  'journey progress stepper screen',
  'property details form screen',
  'offer screen',
]

function detectScreenType(label) {
  const l = label.toLowerCase()
  if (/otp|verification/.test(l))
    return { screenType: 'otp', hasForm: true, components: ['input', 'button', 'timer', 'resend link'] }
  if (/phone.?number|mobile.?number/.test(l))
    return { screenType: 'auth', hasForm: true, components: ['input', 'button', 'country selector'] }
  if (/login|sign.?in|auth/.test(l))
    return { screenType: 'auth', hasForm: true, components: ['input', 'button', 'link'] }
  if (/register|sign.?up|create.?account/.test(l))
    return { screenType: 'auth', hasForm: true, components: ['input', 'button', 'checkbox'] }
  if (/consent|permission|terms|accept/.test(l))
    return { screenType: 'consent', hasForm: true, components: ['checkbox', 'button', 'text', 'scroll view'] }
  if (/stepper|progress|journey/.test(l))
    return { screenType: 'stepper', hasForm: false, components: ['stepper', 'progress bar', 'navigation', 'cards'] }
  if (/property|details.?form/.test(l))
    return { screenType: 'form', hasForm: true, components: ['input', 'dropdown', 'button', 'form sections'] }
  if (/offer/.test(l))
    return { screenType: 'offer', hasForm: false, components: ['cards', 'button', 'summary', 'pricing'] }
  if (/home|dashboard/.test(l))
    return { screenType: 'home', hasForm: false, components: ['cards', 'navigation', 'bottom tabs', 'quick actions'] }
  if (/landing/.test(l))
    return { screenType: 'landing', hasForm: false, components: ['carousel', 'cards', 'navigation', 'CTA button'] }
  if (/search|filter|list/.test(l))
    return { screenType: 'list', hasForm: true, components: ['input', 'list', 'filters'] }
  if (/profile|settings|account/.test(l))
    return { screenType: 'settings', hasForm: true, components: ['input', 'toggle', 'button'] }
  if (/cart|checkout|payment/.test(l))
    return { screenType: 'transaction', hasForm: true, components: ['input', 'button', 'summary'] }
  return { screenType: 'generic', hasForm: false, components: ['unknown'] }
}

function findRemainingScreens(uploadedLabels) {
  const uploaded = uploadedLabels.map((l) => l.toLowerCase().trim())
  const matchedIndices = []
  for (const ul of uploaded) {
    const idx = KNOWN_FLOW.findIndex((kf) => ul.includes(kf) || kf.includes(ul))
    if (idx !== -1) matchedIndices.push(idx)
  }
  if (matchedIndices.length === 0) return []
  const maxIdx = Math.max(...matchedIndices)
  return KNOWN_FLOW.slice(maxIdx + 1)
}

function buildSummary(screens, userContext, devices) {
  const parts = []

  const typeDesc = {
    auth: 'authentication screen with phone number input for login/signup',
    otp: 'OTP verification screen with code input and resend option',
    landing: 'landing page with hero section, navigation, and CTA',
    home: 'home dashboard with quick actions, cards, and bottom navigation',
    consent: 'consent screen with terms acceptance and checkboxes',
    stepper: 'journey progress stepper showing multi-step workflow',
    form: 'details form with input fields, dropdowns, and validation',
    offer: 'offer screen displaying loan/plan options with pricing',
    settings: 'settings page with form controls and toggles',
    transaction: 'checkout/payment screen with form inputs',
    list: 'listing screen with search and filters',
    generic: 'app screen',
  }

  parts.push(`I've analyzed ${screens.length} screen${screens.length !== 1 ? 's' : ''} and learned your app flow.`)

  // Describe the detected flow
  if (screens.length > 0) {
    const flowSteps = screens.map((s, i) => {
      const name = s.label || s.name
      return `${i + 1}. ${name} — ${typeDesc[s.screenType] || 'app screen'}`
    })
    parts.push('\n\nDetected user flow:\n' + flowSteps.join('\n'))
  }

  // Describe detected components
  const allComponents = [...new Set(screens.flatMap((s) => s.components))]
  const validComponents = allComponents.filter(c => c !== 'unknown')
  if (validComponents.length > 0) {
    parts.push(`\n\nUI elements detected: ${validComponents.join(', ')}.`)
  }

  // Describe transitions
  if (screens.length > 1) {
    const transitions = []
    for (let i = 0; i < screens.length - 1; i++) {
      transitions.push(`${screens[i].label || screens[i].name} → ${screens[i + 1].label || screens[i + 1].name}`)
    }
    parts.push(`Screen transitions: ${transitions.join(', ')}.`)
  }

  // Check for remaining screens not uploaded
  const uploadedLabels = screens.map((s) => s.label || s.name)
  const remaining = findRemainingScreens(uploadedLabels)
  if (remaining.length > 0) {
    parts.push(`\n\nNote: I can see the flow up to ${uploadedLabels[uploadedLabels.length - 1]}. There are ${remaining.length} more screen${remaining.length !== 1 ? 's' : ''} in the typical flow after this: ${remaining.join(', ')}. Upload these screenshots so I can include them in the test coverage.`)
  }

  if (devices.length > 1) {
    parts.push(`\nDevices: ${devices.join(' & ')}.`)
  }

  parts.push('\nNow tell me — what aspects would you like me to test?')
  return parts.join(' ')
}

function buildTestCase(idx, screen, type, opts) {
  const name = screen.label || screen.name
  const id = `TC-${String(idx).padStart(3, '0')}`
  const device = screen.device

  const stepsMap = {
    'Visual Regression': () => [
      `Capture baseline screenshot of ${name}${device ? ` on ${device}` : ''}`,
      'Compare current render against baseline pixel-by-pixel',
      'Verify typography: font-family, size, weight, line-height',
      'Verify color values for backgrounds, text, and borders',
      'Check spacing and padding match design spec',
      'Verify icon rendering and image asset quality',
      ...(opts.responsiveFocus.length > 0 ? ['Capture screenshots at 375px, 768px, 1440px viewports'] : []),
    ],
    'Cross-Browser': () => [
      `Open ${name} in Chrome, Firefox, Safari${device === 'mobile' ? ', and mobile Safari/Chrome' : ''}`,
      'Compare layout rendering across all browsers',
      'Verify CSS features render consistently (flexbox, grid, shadows)',
      'Test font rendering and anti-aliasing differences',
      'Verify form controls and inputs appear correctly',
      'Check scroll behavior and animations across browsers',
    ],
    Functional: () => {
      const steps = [`Navigate to ${name}${device ? ` on ${device}` : ''}`]
      if (screen.components.includes('input')) steps.push('Interact with all input fields and verify data binding')
      if (screen.components.includes('button')) steps.push('Click each actionable button and verify state change')
      if (screen.components.includes('navigation')) steps.push('Test all navigation links and verify routing')
      steps.push('Verify correct data is displayed after each interaction')
      if (screen.components.includes('list')) steps.push('Verify list rendering, sorting, and pagination')
      if (screen.components.includes('toggle')) steps.push('Toggle all switches and verify state persistence')
      return steps
    },
    Accessibility: () => [
      `Navigate to ${name}${device ? ` on ${device}` : ''}`,
      'Run automated a11y audit (axe-core or Lighthouse)',
      'Verify all images have meaningful alt text',
      'Tab through all interactive elements and verify focus order',
      'Test with screen reader (VoiceOver/NVDA) for correct announcements',
      'Verify color contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)',
      'Check ARIA labels and roles on custom components',
      ...(device === 'mobile' ? ['Verify touch targets are at least 44x44px'] : []),
    ],
    Responsive: () => [
      `Open ${name} at 375px (mobile), 768px (tablet), 1440px (desktop)`,
      'Verify no horizontal overflow or content clipping at each breakpoint',
      'Check navigation adapts correctly (hamburger menu on mobile)',
      'Verify images scale and crop appropriately',
      'Test touch vs pointer interactions at each viewport',
      'Verify font sizes scale for readability',
    ],
    'Edge Cases': () => {
      const steps = [`Open ${name}${device ? ` on ${device}` : ''}`]
      if (screen.hasForm) {
        steps.push('Submit form with all fields empty')
        steps.push('Enter maximum character limit in each field')
        steps.push('Paste special characters, emoji, and RTL text')
        if (opts.formValidation.includes('Boundary and edge values'))
          steps.push('Test numeric boundaries (0, -1, MAX_INT)')
      }
      steps.push('Simulate slow 3G network and verify loading states')
      steps.push('Rapidly click/tap interactive elements (debounce test)')
      steps.push('Test with JavaScript disabled where applicable')
      return steps
    },
    Security: () => [
      `Open ${name}${device ? ` on ${device}` : ''}`,
      'Attempt XSS injection via all input fields',
      'Inspect network tab for sensitive data in plain text',
      'Verify HTTPS and secure cookie flags',
      'Test direct URL access to protected resources',
      'Check for proper CSP headers',
    ],
    'End-to-End Flow': () => [`This screen is part of the E2E flow (see dedicated E2E test case)`],
  }

  const steps = (stepsMap[type] || stepsMap.Functional)()

  // Append form validation steps if relevant
  if (type === 'Functional' && screen.hasForm && opts.formValidation.length > 0) {
    opts.formValidation.forEach((v) => {
      steps.push(`Validate: ${v}`)
    })
  }

  return {
    id,
    name: `${name} — ${type} testing`,
    device,
    type,
    priority: opts.priority === 'Critical user journeys only' ? 'critical' : opts.priority === 'All screens equally' ? 'medium' : 'high',
    preconditions: getPrecondition(screen),
    steps,
    expected: `${name} passes all ${type.toLowerCase()} checks${device ? ` on ${device}` : ''}`,
  }
}

function getPrecondition(screen) {
  switch (screen.screenType) {
    case 'auth': return 'User is on the phone number input screen, not logged in'
    case 'otp': return 'User has entered a valid phone number and OTP has been sent'
    case 'landing': return 'App is loaded and user is on the landing page'
    case 'home': return 'User is logged in and on the home dashboard'
    case 'consent': return 'User has verified OTP and reached the consent acceptance step'
    case 'stepper': return 'User has accepted consent and is viewing the journey progress'
    case 'form': return 'User is on the property/personal details form step'
    case 'offer': return 'User has completed all form steps and is viewing available offers'
    case 'settings': return 'User is logged in and on the settings page'
    case 'transaction': return 'User has items ready and is on the checkout screen'
    case 'list': return 'User has navigated to the listing/search screen'
    default: return 'User has navigated to this screen'
  }
}

function buildAuthTest(idx, screen, scenario) {
  const scenarioMap = {
    'Happy path login': {
      steps: ['Enter valid credentials', 'Click login/submit', 'Verify successful redirect'],
      expected: 'User is logged in and redirected to the home/dashboard screen',
    },
    'Invalid credentials': {
      steps: ['Enter invalid email/password', 'Click login/submit', 'Verify error message is shown'],
      expected: 'Appropriate error message displayed, user remains on login screen',
    },
    'Session expiry': {
      steps: ['Login successfully', 'Wait for session timeout', 'Attempt to perform an action'],
      expected: 'User is redirected to login with a session expired message',
    },
    'OTP/2FA': {
      steps: ['Enter valid credentials', 'Receive OTP', 'Enter correct OTP', 'Verify login'],
      expected: 'User passes 2FA and is granted access',
    },
    'Forgot password': {
      steps: ['Click forgot password link', 'Enter registered email', 'Verify reset email sent'],
      expected: 'Password reset email is sent, confirmation shown to user',
    },
  }

  const s = scenarioMap[scenario] || { steps: [scenario], expected: 'Scenario completes as expected' }

  return {
    id: `TC-${String(idx).padStart(3, '0')}`,
    name: `Auth: ${scenario}`,
    device: screen.device,
    type: 'Security',
    priority: 'critical',
    preconditions: 'User is on the authentication screen',
    steps: s.steps,
    expected: s.expected,
  }
}

function getAnswer(answers, id) {
  const entry = answers.find((a) => a.questionId === id)
  return entry ? entry.answer : null
}

// ── Generate Cross-Variant Flows ─────────────────────────────────────
// Analyzes all variants and suggests E2E flows that span multiple apps
export async function generateCrossVariantFlows(variants) {
  await delay(1500)

  // Need at least 2 variants to generate cross-variant flows
  if (!variants || variants.length < 2) {
    return []
  }

  // Extract context from each variant
  const variantContexts = variants.map(v => ({
    id: v.id,
    name: v.name,
    icon: v.icon,
    description: v.description || '',
    testCases: v.testCases || [],
    screensCount: (v.mobileScreenshots?.length || 0) + (v.desktopScreenshots?.length || 0),
    hasAnalysis: (v.messages || []).some(m => m.text?.includes('analyzed') || m.text?.includes('test cases'))
  }))

  // Detect app types and relationships
  const appTypes = detectAppTypes(variantContexts)
  const flows = generateFlowSuggestions(variantContexts, appTypes)

  return flows
}

function detectAppTypes(variants) {
  const types = {}

  variants.forEach(v => {
    const name = v.name.toLowerCase()
    const desc = v.description.toLowerCase()
    const combined = `${name} ${desc}`

    if (combined.includes('user') || combined.includes('customer') || combined.includes('buyer') || combined.includes('main')) {
      types[v.id] = 'customer'
    } else if (combined.includes('driver') || combined.includes('delivery') || combined.includes('courier')) {
      types[v.id] = 'delivery'
    } else if (combined.includes('merchant') || combined.includes('seller') || combined.includes('vendor') || combined.includes('shop') || combined.includes('restaurant')) {
      types[v.id] = 'merchant'
    } else if (combined.includes('admin') || combined.includes('dashboard') || combined.includes('back')) {
      types[v.id] = 'admin'
    } else {
      types[v.id] = 'generic'
    }
  })

  return types
}

function generateFlowSuggestions(variants, appTypes) {
  const flows = []
  const hasCustomer = Object.values(appTypes).includes('customer')
  const hasDelivery = Object.values(appTypes).includes('delivery')
  const hasMerchant = Object.values(appTypes).includes('merchant')
  const hasAdmin = Object.values(appTypes).includes('admin')

  const customerVariant = variants.find(v => appTypes[v.id] === 'customer')
  const deliveryVariant = variants.find(v => appTypes[v.id] === 'delivery')
  const merchantVariant = variants.find(v => appTypes[v.id] === 'merchant')
  const adminVariant = variants.find(v => appTypes[v.id] === 'admin')

  // Order Delivery E2E Flow (Customer + Delivery)
  if (hasCustomer && hasDelivery) {
    flows.push({
      id: `flow-${Date.now()}-1`,
      name: 'Order Delivery E2E',
      description: 'Complete order flow from customer placement to delivery completion',
      steps: [
        { id: 's1', variantId: customerVariant.id, description: 'Customer opens app and browses products/menu', tags: [customerVariant.name] },
        { id: 's2', variantId: customerVariant.id, description: 'Customer adds items to cart', tags: [customerVariant.name] },
        { id: 's3', variantId: customerVariant.id, description: 'Customer proceeds to checkout and completes payment', tags: [customerVariant.name, 'Payment'], syncPoint: true },
        { id: 's4', variantId: deliveryVariant.id, description: 'Driver receives order notification', tags: [deliveryVariant.name, 'Notification'], syncPoint: true },
        { id: 's5', variantId: deliveryVariant.id, description: 'Driver accepts order and navigates to pickup', tags: [deliveryVariant.name] },
        { id: 's6', variantId: deliveryVariant.id, description: 'Driver picks up order and starts delivery', tags: [deliveryVariant.name] },
        { id: 's7', variantId: customerVariant.id, description: 'Customer tracks order in real-time', tags: [customerVariant.name, 'Tracking'] },
        { id: 's8', variantId: deliveryVariant.id, description: 'Driver completes delivery', tags: [deliveryVariant.name] },
        { id: 's9', variantId: customerVariant.id, description: 'Customer receives delivery confirmation and rates', tags: [customerVariant.name, 'Rating'] },
      ]
    })
  }

  // Order Cancellation Flow
  if (hasCustomer && hasDelivery) {
    flows.push({
      id: `flow-${Date.now()}-2`,
      name: 'Order Cancellation',
      description: 'Test order cancellation scenarios and notifications',
      steps: [
        { id: 's1', variantId: customerVariant.id, description: 'Customer places an order', tags: [customerVariant.name] },
        { id: 's2', variantId: deliveryVariant.id, description: 'Driver receives and accepts order', tags: [deliveryVariant.name], syncPoint: true },
        { id: 's3', variantId: customerVariant.id, description: 'Customer cancels the order', tags: [customerVariant.name, 'Cancellation'] },
        { id: 's4', variantId: deliveryVariant.id, description: 'Driver receives cancellation notification', tags: [deliveryVariant.name, 'Notification'] },
        { id: 's5', variantId: customerVariant.id, description: 'Customer verifies refund initiated', tags: [customerVariant.name, 'Refund'] },
      ]
    })
  }

  // Merchant Order Flow (Customer + Merchant)
  if (hasCustomer && hasMerchant) {
    flows.push({
      id: `flow-${Date.now()}-3`,
      name: 'Merchant Order Processing',
      description: 'Order flow from customer to merchant acceptance',
      steps: [
        { id: 's1', variantId: customerVariant.id, description: 'Customer browses merchant catalog and places order', tags: [customerVariant.name] },
        { id: 's2', variantId: merchantVariant.id, description: 'Merchant receives new order notification', tags: [merchantVariant.name, 'Notification'], syncPoint: true },
        { id: 's3', variantId: merchantVariant.id, description: 'Merchant reviews and accepts order', tags: [merchantVariant.name] },
        { id: 's4', variantId: customerVariant.id, description: 'Customer receives order confirmation', tags: [customerVariant.name] },
        { id: 's5', variantId: merchantVariant.id, description: 'Merchant prepares and marks order ready', tags: [merchantVariant.name] },
        { id: 's6', variantId: customerVariant.id, description: 'Customer receives ready notification', tags: [customerVariant.name, 'Notification'] },
      ]
    })
  }

  // Full Supply Chain (Customer + Merchant + Delivery)
  if (hasCustomer && hasMerchant && hasDelivery) {
    flows.push({
      id: `flow-${Date.now()}-4`,
      name: 'Full Order Lifecycle',
      description: 'Complete E2E flow across customer, merchant, and delivery',
      steps: [
        { id: 's1', variantId: customerVariant.id, description: 'Customer places order', tags: [customerVariant.name] },
        { id: 's2', variantId: merchantVariant.id, description: 'Merchant accepts and prepares order', tags: [merchantVariant.name], syncPoint: true },
        { id: 's3', variantId: merchantVariant.id, description: 'Merchant marks order ready for pickup', tags: [merchantVariant.name] },
        { id: 's4', variantId: deliveryVariant.id, description: 'Driver assigned and picks up order', tags: [deliveryVariant.name], syncPoint: true },
        { id: 's5', variantId: deliveryVariant.id, description: 'Driver delivers to customer', tags: [deliveryVariant.name] },
        { id: 's6', variantId: customerVariant.id, description: 'Customer confirms delivery', tags: [customerVariant.name] },
      ]
    })
  }

  // Admin Oversight Flow
  if (hasAdmin && (hasCustomer || hasMerchant || hasDelivery)) {
    const otherVariant = customerVariant || merchantVariant || deliveryVariant
    flows.push({
      id: `flow-${Date.now()}-5`,
      name: 'Admin Oversight',
      description: 'Admin monitoring and intervention scenarios',
      steps: [
        { id: 's1', variantId: otherVariant.id, description: 'User reports an issue', tags: [otherVariant.name, 'Support'] },
        { id: 's2', variantId: adminVariant.id, description: 'Admin receives support ticket', tags: [adminVariant.name], syncPoint: true },
        { id: 's3', variantId: adminVariant.id, description: 'Admin reviews and takes action', tags: [adminVariant.name] },
        { id: 's4', variantId: otherVariant.id, description: 'User receives resolution notification', tags: [otherVariant.name, 'Notification'] },
      ]
    })
  }

  // Generic multi-variant flow if no specific patterns detected
  if (flows.length === 0 && variants.length >= 2) {
    flows.push({
      id: `flow-${Date.now()}-generic`,
      name: 'Cross-App Integration',
      description: 'Basic integration flow between apps',
      steps: variants.map((v, i) => ({
        id: `s${i + 1}`,
        variantId: v.id,
        description: `Action in ${v.name}`,
        tags: [v.name],
        syncPoint: i > 0
      }))
    })
  }

  return flows
}
