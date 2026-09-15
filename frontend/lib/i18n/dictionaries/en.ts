const en = {
  meta: {
    title: "Akedly — E-commerce Order Automation",
    description:
      "Automate order confirmation, WhatsApp follow-ups, prepaid payments, and courier creation with Akedly.",
  },
  nav: {
    product: "Product",
    howItWorks: "How It Works",
    integrations: "Integrations",
    pricing: "Pricing",
    faq: "FAQ",
    login: "Login",
    getStarted: "Get Started",
    dashboard: "Dashboard",
  },
  common: {
    startFree: "Start Free",
    seeHowItWorks: "See How It Works",
    talkToSales: "Talk to Sales",
    comingSoon: "Coming Soon",
    live: "Live",
    demoDataNote: "Demo data shown for illustration purposes only.",
    egp: "EGP",
  },
  hero: {
    eyebrow: "Order automation for Egyptian e-commerce",
    headline: "From Order to Delivery. Automatically.",
    sub: "Akedly automates order confirmation, cancellation recovery, prepaid payments, and courier creation — so your team can focus on growing your store.",
    ctaPrimary: "Start Free",
    ctaSecondary: "See How It Works",
    flowTitle: "Order Workflow",
    flow: {
      newOrder: "New Order",
      whatsapp: "WhatsApp Confirmation",
      confirmed: "Confirmed",
      prepaid: "Prepaid",
      courier: "Courier Created",
    },
    worksWith: "Works with",
  },
  trustStrip: {
    heading: "Built for modern e-commerce teams.",
  },
  problem: {
    heading: "Every order creates work. Akedly removes it.",
    sub: "The traditional order process eats hours every day. Akedly turns it into a workflow that runs itself.",
    manualLabel: "The manual process",
    manualSteps: [
      "New order",
      "Check order",
      "Message customer",
      "Wait for response",
      "Call customer",
      "Handle cancellation",
      "Prepare payment",
      "Create courier order",
      "Update systems",
    ],
    withoutTitle: "Without Akedly",
    withoutItems: [
      "Manual follow-ups on every order",
      "Missed confirmations and slow replies",
      "Fake or unresponsive orders slip through",
      "Manual courier creation for every shipment",
      "Lost prepaid opportunities",
    ],
    withTitle: "With Akedly",
    withSteps: [
      "Order received",
      "Automatically contact customer",
      "Confirm / cancel",
      "Recover / upsell",
      "Create shipment",
    ],
  },
  howItWorks: {
    heading: "Your entire order workflow, on autopilot.",
    sub: "Five steps. Zero manual follow-up.",
    steps: {
      order: {
        step: "Step 1",
        title: "Order Received",
        body: "Akedly instantly captures new orders from Shopify, WooCommerce, and custom websites.",
      },
      whatsapp: {
        step: "Step 2",
        title: "WhatsApp Confirmation",
        body: "A personalized WhatsApp message is automatically sent to the customer to confirm the order.",
      },
      cancellation: {
        step: "Step 3",
        title: "Cancellation Recovery",
        body: "If a customer cancels, Akedly asks why — turning every cancellation into actionable data.",
      },
      prepaid: {
        step: "Step 4",
        title: "Get Paid Before You Ship",
        body: "After confirmation, Akedly offers a prepaid checkout incentive to reduce COD risk.",
      },
      courier: {
        step: "Step 5",
        title: "Courier Creation",
        body: "Once confirmed, Akedly automatically creates the delivery order with your connected courier.",
      },
    },
    whatsappCard: {
      contact: "Ahmed",
      greeting: "Hi Ahmed 👋",
      received: "Your order #10482 has been received.",
      totalLabel: "Total",
      confirmPrompt: "Please confirm your order:",
      confirmBtn: "Confirm Order",
      cancelBtn: "Cancel Order",
    },
    cancellationCard: {
      question: "Why did you cancel?",
      options: [
        "Too expensive",
        "Changed my mind",
        "Found another product",
        "Delivery time",
        "Other",
      ],
      footnote: "Cancellation reasons become analytics.",
    },
    prepaidCard: {
      confirmedLabel: "Your order is confirmed.",
      offer: "Pay online now and save 5%.",
      payNow: "Pay Now",
      methods: "Card · Apple Pay · Wallets",
    },
    courierCard: {
      orderLabel: "Order",
      confirmed: "Confirmed",
      paymentReady: "Payment Ready",
      shipmentCreated: "Shipment Created",
      courierLabel: "Courier",
      trackingLabel: "Tracking",
    },
  },
  dashboard: {
    eyebrow: "Product Preview",
    heading: "See your entire order flow at a glance.",
    sub: "A live look at how Akedly's dashboard keeps every order, confirmation, and shipment in one place.",
    stats: {
      ordersToday: "Orders Today",
      confirmationRate: "Confirmation Rate",
      cancellationRate: "Cancellation Rate",
      prepaidOrders: "Prepaid Orders",
      shipmentsCreated: "Shipments Created",
    },
    table: {
      order: "Order",
      customer: "Customer",
      amount: "Amount",
      status: "Status",
      source: "Source",
    },
    status: {
      confirmed: "Confirmed",
      prepaid: "Prepaid",
      cancelled: "Cancelled",
      pending: "Pending",
    },
    source: {
      shopify: "Shopify",
      woocommerce: "WooCommerce",
      custom: "Custom",
    },
    activityTitle: "WhatsApp Automation Activity",
    activity: [
      "Confirmation sent to Ahmed Ali — Order #10482",
      "Sara Mohamed confirmed her order via WhatsApp",
      "Cancellation reason recorded for Order #10480",
      "Prepaid link sent to Mona Youssef — Order #10479",
    ],
    demoNote: "Demo data shown for illustration purposes only.",
  },
  features: {
    heading: "Everything your order workflow needs.",
    sub: "Akedly replaces the manual work between checkout and delivery with automation you configure once.",
    items: {
      whatsapp: {
        title: "WhatsApp Confirmation",
        description: "Automatically confirm orders with customers over WhatsApp.",
      },
      cancellation: {
        title: "Cancellation Recovery",
        description: "Understand why customers cancel and recover more orders.",
      },
      prepaid: {
        title: "Prepaid Conversion",
        description: "Encourage COD customers to pay online before shipping.",
      },
      courier: {
        title: "Courier Automation",
        description: "Create courier shipments automatically once an order is confirmed.",
      },
      multiStore: {
        title: "Multi-Store",
        description: "Manage multiple stores from one Akedly account.",
      },
      analytics: {
        title: "Analytics",
        description: "Understand confirmation, cancellation, prepaid, and delivery performance.",
      },
      automationRules: {
        title: "Automation Rules",
        description: "Configure exactly how each workflow behaves for your store.",
      },
      customerHistory: {
        title: "Customer History",
        description: "See a customer's full order and interaction history in one place.",
      },
    },
  },
  integrations: {
    heading: "Connect the tools you already use.",
    sub: "Akedly plugs into your storefront, courier, and communication channels.",
    connect: "Connect",
    items: {
      shopify: {
        name: "Shopify",
        description: "Connect your Shopify store in minutes.",
      },
      woocommerce: {
        name: "WooCommerce",
        description: "Connect your WooCommerce store.",
      },
      whatsapp: {
        name: "WhatsApp",
        description: "Automate customer communication end to end.",
      },
      bosta: {
        name: "Bosta",
        description: "Create shipments automatically with Bosta.",
      },
      aramex: {
        name: "Aramex",
        description: "Connect your Aramex courier operations.",
      },
      customApi: {
        name: "Custom API",
        description: "Connect any custom e-commerce platform.",
      },
    },
  },
  analytics: {
    heading: "Turn every order into useful data.",
    sub: "Sample analytics from a demo Akedly account.",
    stats: {
      confirmationRate: "Confirmation Rate",
      cancellationRate: "Cancellation Rate",
      prepaidConversion: "Prepaid Conversion",
      failedDelivery: "Failed Delivery",
    },
    reasonsTitle: "Top Cancellation Reasons",
    reasons: {
      shippingCost: "Shipping cost",
      changedMind: "Changed mind",
      price: "Price",
      deliveryTime: "Delivery time",
      other: "Other",
    },
    demoNote: "Sample analytics — your data will vary.",
  },
  pricing: {
    heading: "Simple pricing that scales with you.",
    sub: "Start free. Upgrade as your order volume grows.",
    priceComingSoon: "Coming Soon",
    mostPopular: "Most Popular",
    cta: "Start Free",
    plans: {
      starter: {
        name: "Starter",
        description: "For small stores getting started with automation.",
        features: [
          "Order automation",
          "WhatsApp confirmation",
          "Basic analytics",
          "1 store",
        ],
      },
      growth: {
        name: "Growth",
        description: "For growing stores ready to recover more orders.",
        features: [
          "Everything in Starter",
          "Cancellation recovery",
          "Prepaid upsells",
          "Courier automation",
          "Multiple stores",
          "Advanced analytics",
        ],
      },
      scale: {
        name: "Scale",
        description: "For high-volume businesses with custom needs.",
        features: [
          "Everything in Growth",
          "Advanced automation",
          "API access",
          "Priority support",
          "Custom limits",
        ],
      },
    },
  },
  faq: {
    heading: "Frequently asked questions",
    sub: "Everything you need to know before getting started.",
    items: [
      {
        q: "What is Akedly?",
        a: "Akedly is an order automation platform for e-commerce stores. It automates WhatsApp order confirmation, cancellation recovery, prepaid payments, and courier creation so your team doesn't have to chase every order manually.",
      },
      {
        q: "Does Akedly work with Shopify?",
        a: "Yes. Akedly connects directly to your Shopify store and starts capturing orders automatically.",
      },
      {
        q: "Does Akedly work with WooCommerce?",
        a: "Yes. Akedly connects to WooCommerce stores through a dedicated integration.",
      },
      {
        q: "Do I need a WhatsApp number?",
        a: "You'll connect a WhatsApp number during setup so Akedly can send confirmation and follow-up messages on your behalf.",
      },
      {
        q: "Can Akedly automatically create courier shipments?",
        a: "Yes. Once an order is confirmed, Akedly can automatically create a shipment with your connected courier, such as Bosta.",
      },
      {
        q: "Can I manage multiple stores?",
        a: "Yes. Growth and Scale plans let you manage multiple stores from a single Akedly account.",
      },
      {
        q: "Can I offer customers prepaid discounts?",
        a: "Yes. After an order is confirmed, Akedly can offer the customer a prepaid checkout incentive to pay online before shipping.",
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes. You can cancel your Akedly subscription at any time from your account settings.",
      },
    ],
  },
  finalCta: {
    heading: "Stop chasing orders. Start automating them.",
    sub: "Let Akedly handle the repetitive work between checkout and delivery.",
    ctaPrimary: "Start Free",
    ctaSecondary: "Talk to Sales",
  },
  footer: {
    description: "E-commerce order automation for modern stores.",
    productHeading: "Product",
    companyHeading: "Company",
    legalHeading: "Legal",
    links: {
      product: "Product",
      howItWorks: "How It Works",
      integrations: "Integrations",
      pricing: "Pricing",
      faq: "FAQ",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
    },
    copyright: "© 2026 Akedly. All rights reserved.",
  },
  legal: {
    privacy: {
      title: "Privacy Policy",
      updated: "Last updated: January 2026",
      intro:
        "Akedly is in active development. This page outlines our intended approach to privacy and will be replaced with a complete policy before general availability.",
      sections: [
        {
          heading: "Information we collect",
          body: "When you register interest in Akedly, we collect the details you submit — such as your name, business name, email, and phone number — to set up your account and get in touch about early access.",
        },
        {
          heading: "How we use your information",
          body: "We use your information to operate the Akedly platform, communicate with you about your account, and improve our order automation workflows.",
        },
        {
          heading: "Data sharing",
          body: "We do not sell your data. Information is shared only with the services you explicitly connect, such as your store platform, courier, or WhatsApp Business account.",
        },
        {
          heading: "Contact",
          body: "Questions about this policy can be sent to hello@akedly.com.",
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      updated: "Last updated: January 2026",
      intro:
        "Akedly is in active development. These terms describe the intended use of the platform and will be finalized before general availability.",
      sections: [
        {
          heading: "Using Akedly",
          body: "By creating an account, you agree to use Akedly for legitimate e-commerce order automation and to provide accurate information about your business.",
        },
        {
          heading: "Account responsibilities",
          body: "You are responsible for the accuracy of the orders, customer messages, and payment configurations connected through your Akedly account.",
        },
        {
          heading: "Cancellation",
          body: "You can cancel your Akedly subscription at any time from your account settings.",
        },
        {
          heading: "Contact",
          body: "Questions about these terms can be sent to hello@akedly.com.",
        },
      ],
    },
  },
  auth: {
    login: {
      title: "Welcome back",
      sub: "Log in to your Akedly account.",
      highlights: [
        "One dashboard for every order",
        "WhatsApp confirmations sent automatically",
        "Shipments created the moment orders confirm",
      ],
      email: "Email",
      password: "Password",
      submit: "Log In",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      createAccount: "Create one",
      orDivider: "or",
      submitting: "Signing in...",
      success: "You're in! Redirecting...",
      errors: {
        invalidCredentials: "Incorrect email or password.",
        validation: "Please check your email and password and try again.",
        network: "Couldn't reach the server. Check your connection and try again.",
        generic: "Something went wrong. Please try again.",
      },
    },
    register: {
      title: "Create your account",
      sub: "Start automating your order workflow in minutes.",
      highlights: [
        "Free to start — no credit card required",
        "Connect Shopify or WooCommerce in minutes",
        "Cancel anytime from your account settings",
      ],
      name: "Full name",
      businessName: "Business name",
      email: "Email",
      phone: "Phone number",
      password: "Password",
      platform: "Store platform",
      platformOptional: "(optional)",
      platformOptions: {
        shopify: "Shopify",
        woocommerce: "WooCommerce",
        custom: "Custom website",
        other: "Other",
      },
      platformPlaceholder: "Select your platform",
      submit: "Start Free",
      haveAccount: "Already have an account?",
      signIn: "Sign in",
      terms: "By continuing, you agree to Akedly's Terms and Privacy Policy.",
      submitting: "Creating your account...",
      success: "Your account is ready! Redirecting...",
      errors: {
        emailExists: "An account with this email already exists.",
        validation: "Please check the highlighted fields and try again.",
        network: "Couldn't reach the server. Check your connection and try again.",
        generic: "Something went wrong. Please try again.",
      },
    },
  },
  appDashboard: {
    nav: {
      overview: "Overview",
      orders: "Orders",
    },
    logout: "Log out",
    loggingOut: "Logging out...",
    overview: {
      title: "Overview",
      welcomeBack: "Welcome back",
      stats: {
        totalOrders: "Total Orders",
        pendingConfirmation: "Pending Confirmation",
        confirmed: "Confirmed",
        cancelled: "Cancelled",
        expired: "Expired",
        confirmationRate: "Confirmation Rate",
      },
      connectShopify: "Connect your Shopify store to start receiving orders here.",
    },
    orders: {
      title: "Orders",
      table: {
        order: "Order",
        customer: "Customer",
        amount: "Amount",
        status: "Status",
        method: "Method",
        created: "Created",
      },
      statusLabels: {
        PENDING_CONFIRMATION: "Pending",
        CONFIRMED: "Confirmed",
        CANCELLED: "Cancelled",
        EXPIRED: "Expired",
      },
      empty: "No orders yet. Once your store sends orders, they'll show up here.",
    },
  },
};

export default en;
export type Dictionary = typeof en;
