const pptxgen = require('pptxgenjs');

let pres = new pptxgen();

// Slide 1: Title
let slide1 = pres.addSlide();
slide1.addText("Monetstudy", { x: 1, y: 1.5, w: '80%', h: 1, fontSize: 48, bold: true, align: 'center', color: '1A1A1A' });
slide1.addText("The intelligence to learn your way.\n\nPresenter: Kyeyune Neithen, Founder", { x: 1, y: 3, w: '80%', h: 2, fontSize: 24, align: 'center', color: '333333' });

// Function to add slides
function addSlide(title, points) {
    let slide = pres.addSlide();
    slide.addText(title, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 36, bold: true, color: '1A1A1A' });
    
    let textArray = points.map(p => {
        if (Array.isArray(p)) {
            return { text: p[0], options: { indentLevel: p[1], bullet: true } };
        }
        return { text: p, options: { bullet: true } };
    });
    
    slide.addText(textArray, { x: 0.5, y: 1.8, w: '90%', h: 3.5, fontSize: 20, color: '333333' });
}

addSlide("The Problem", [
    "Information Overload: Students are overwhelmed by disorganized notes and scattered resources.",
    "Dense, Intimidating Textbooks: Massive books discourage students.",
    "Standardized Inefficiency: Traditional education forces everyone to learn the exact same way."
]);

addSlide("The Philosophy", [
    "The Core Belief: The best way to learn is our own way.",
    "The Shift: Education shouldn't force the student to adapt to the material. It should focus on adapting the material to the student."
]);

addSlide("The Solution: Monetstudy", [
    "A next-generation AI-powered personalized learning environment.",
    "Students upload hundreds of pages of unorganized material or dense textbooks.",
    "They apply Custom Instructions (e.g., 'Teach me using real-world analogies').",
    "Monetstudy instantly transforms the chaos into a structured, perfectly tailored course."
]);

addSlide("How It Works", [
    "Step 1: Ingest. Upload massive documents. Our AI pipeline handles entire textbooks seamlessly.",
    "Step 2: Personalize. Set Custom Instructions. Tell the AI how your brain processes info.",
    "Step 3: Learn. Get a dynamic course with beautifully rendered equations, AI illustrations, and step-by-step topic breakdowns."
]);

addSlide("The Unfair Advantage (Technology)", [
    "Massive Document Processing: Custom-built architecture deeply analyzes and retrieves data from 3M+ character documents natively.",
    "Intelligent Generation: Acts as a dynamic tutor creating complete topical outlines.",
    "Integrated AI Visuals: Embeds custom AI illustrations directly alongside the text to aid memory."
]);

addSlide("Business Model & Pricing", [
    "Freemium Strategy to remove barriers while monetizing heavy users.",
    ["Tier 1: Free / Starter - Core course generation.", 1],
    ["Tier 2: Scholar Plan ($5/month) - Premium features including AI-generated illustrations.", 1],
    ["Tier 3: Unlimited Plan ($10/month) - Full unrestricted processing for massive databases.", 1],
    "Seamless Payments: Natively integrated with Pesapal for mobile money and local cards to ensure accessibility across Africa."
]);

addSlide("The Market Opportunity", [
    "Local to Global: A massive, underserved demographic of students locked out of expensive private tutoring.",
    "The Ed-Tech Gap: Monetstudy fills this gap by democratizing elite, personalized tutoring.",
    "We provide a world-class study tool that scales infinitely, all for the price of a cup of coffee."
]);

addSlide("The Team", [
    "Kyeyune Neithen - Founder & Lead Engineer",
    ["Solo architected the full-stack web application from a room in Uganda.", 1],
    ["Custom-built payment integrations, advanced AI document processing, and scalable cloud architecture.", 1],
    ["Deeply passionate about solving the global education crisis through personalized technology.", 1]
]);

addSlide("The Ask / Vision", [
    "The Vision: To become the default study layer for the modern student.",
    "Turning any disorganized notes or dense textbook into a highly personalized, interactive learning journey.",
    "Call to Action: Looking for initial seed funding or strategic partnerships to scale server infrastructure and accelerate user acquisition."
]);

pres.writeFile({ fileName: "Monetstudy_Pitch_Deck.pptx" }).then(fileName => {
    console.log(`Success! Created file: ${fileName}`);
});
