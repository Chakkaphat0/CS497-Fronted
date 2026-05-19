/**
 * Seed Script: Creates mock users in Firebase Auth + Firestore
 * 
 * Run from project root:
 *   node scripts/seedData.js
 * 
 * Requires: firebase-admin (npm install firebase-admin --save-dev)
 * 
 * This creates:
 * - 8 Candidate accounts (matching mockData.js)
 * - 2 Employer accounts
 * - 5 University admin accounts (one per university)
 * - 1 Super Admin account
 * - interviewScores for each candidate
 * - universities collection
 * - userRoles collection
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Initialize with project ID (uses Application Default Credentials or service account)
const app = initializeApp({
    projectId: 'cs497-e3b0e'
})

const auth = getAuth(app)
const db = getFirestore(app)

const DEFAULT_PASSWORD = 'password123'

// ─── Candidate Data (matches mockData.js) ───────────────────────────
const candidateData = [
    { email: 'somchai@example.com', displayName: 'Somchai Rakdee', title: 'Full-Stack Developer', university: 'Chulalongkorn University', department: 'Computer Engineering', skills: ['React', 'Node.js', 'Python', 'AWS'], scores: { Technical: 9.5, Communication: 8.8, 'Problem Solving': 9.3, Leadership: 8.9, Creativity: 9.0 }, tier: 'premium' },
    { email: 'ploy@example.com', displayName: 'Ploy Suwannarat', title: 'UX/UI Designer', university: 'KMUTT', department: 'Information Technology', skills: ['Figma', 'Adobe XD', 'CSS', 'Design Systems'], scores: { Technical: 8.0, Communication: 9.4, 'Problem Solving': 8.5, Leadership: 8.8, Creativity: 9.6 }, tier: 'free' },
    { email: 'nattapong@example.com', displayName: 'Nattapong Jaidee', title: 'Data Scientist', university: 'Kasetsart University', department: 'Computer Science', skills: ['Python', 'TensorFlow', 'SQL', 'Tableau'], scores: { Technical: 9.1, Communication: 7.8, 'Problem Solving': 8.9, Leadership: 7.5, Creativity: 8.2 }, tier: 'free' },
    { email: 'kanokwan@example.com', displayName: 'Kanokwan Thongchai', title: 'Frontend Developer', university: 'Chulalongkorn University', department: 'Computer Engineering', skills: ['Vue.js', 'React', 'TypeScript', 'Tailwind'], scores: { Technical: 9.2, Communication: 9.0, 'Problem Solving': 8.8, Leadership: 8.5, Creativity: 9.4 }, tier: 'premium' },
    { email: 'pattarapong@example.com', displayName: 'Pattarapong Meesuk', title: 'Backend Engineer', university: 'Mahidol University', department: 'ICT', skills: ['Java', 'Spring Boot', 'Docker', 'Kubernetes'], scores: { Technical: 8.2, Communication: 7.0, 'Problem Solving': 7.8, Leadership: 7.2, Creativity: 7.5 }, tier: 'free' },
    { email: 'siriporn@example.com', displayName: 'Siriporn Kaewsai', title: 'DevOps Engineer', university: 'KMUTT', department: 'Computer Engineering', skills: ['CI/CD', 'AWS', 'Terraform', 'Linux'], scores: { Technical: 9.3, Communication: 8.5, 'Problem Solving': 9.0, Leadership: 8.7, Creativity: 8.0 }, tier: 'premium' },
    { email: 'wichai@example.com', displayName: 'Wichai Intaraprasert', title: 'Mobile Developer', university: 'Chiang Mai University', department: 'Computer Science', skills: ['Flutter', 'React Native', 'Kotlin', 'Swift'], scores: { Technical: 8.5, Communication: 7.9, 'Problem Solving': 8.0, Leadership: 7.6, Creativity: 8.8 }, tier: 'free' },
    { email: 'araya@example.com', displayName: 'Araya Petcharat', title: 'AI/ML Engineer', university: 'Mahidol University', department: 'ICT', skills: ['PyTorch', 'NLP', 'Computer Vision', 'MLOps'], scores: { Technical: 9.8, Communication: 9.0, 'Problem Solving': 9.6, Leadership: 9.2, Creativity: 9.5 }, tier: 'premium' },
]

// ─── Employer Data ──────────────────────────────────────────────────
const employerData = [
    { email: 'employer1@techcorp.com', displayName: 'Tanakrit Wongprasit', companyName: 'TechCorp Co., Ltd.' },
    { email: 'employer2@innovate.com', displayName: 'Praewa Lertkulwong', companyName: 'Innovate Solutions' },
]

// ─── University Admin Data ──────────────────────────────────────────
const universityAdminData = [
    { email: 'admin@chula.ac.th', displayName: 'Dr. Supachai Tangsriwong', universityName: 'Chulalongkorn University' },
    { email: 'admin@kmutt.ac.th', displayName: 'Dr. Waraporn Chaisiriprasert', universityName: 'KMUTT' },
    { email: 'admin@ku.ac.th', displayName: 'Dr. Prawit Chaimongkol', universityName: 'Kasetsart University' },
    { email: 'admin@mahidol.ac.th', displayName: 'Dr. Nalinee Sriamornphun', universityName: 'Mahidol University' },
    { email: 'admin@cmu.ac.th', displayName: 'Dr. Anusorn Tantiwalakorn', universityName: 'Chiang Mai University' },
]

// ─── University Collection Data ─────────────────────────────────────
const universityCollections = [
    {
        name: 'Chulalongkorn University',
        totalStudents: 1240,
        avgOverallScore: 8.3,
        departments: [
            { name: 'Computer Engineering', students: 320, avgScore: 8.7, topScore: 9.5, trend: '+0.3' },
            { name: 'Computer Science', students: 280, avgScore: 8.4, topScore: 9.2, trend: '+0.1' },
            { name: 'Information Technology', students: 210, avgScore: 7.9, topScore: 8.9, trend: '+0.5' },
            { name: 'Electrical Engineering', students: 190, avgScore: 7.5, topScore: 8.7, trend: '-0.2' },
            { name: 'Data Science', students: 140, avgScore: 8.8, topScore: 9.8, trend: '+0.4' },
            { name: 'Software Engineering', students: 100, avgScore: 8.1, topScore: 9.0, trend: '+0.2' },
        ]
    },
    {
        name: 'KMUTT',
        totalStudents: 980,
        avgOverallScore: 8.1,
        departments: [
            { name: 'Computer Engineering', students: 280, avgScore: 8.5, topScore: 9.3, trend: '+0.2' },
            { name: 'Information Technology', students: 250, avgScore: 7.8, topScore: 8.7, trend: '+0.3' },
            { name: 'Computer Science', students: 220, avgScore: 8.0, topScore: 9.0, trend: '+0.1' },
            { name: 'Data Science', students: 130, avgScore: 8.4, topScore: 9.1, trend: '+0.5' },
        ]
    },
    {
        name: 'Kasetsart University',
        totalStudents: 860,
        avgOverallScore: 7.9,
        departments: [
            { name: 'Computer Science', students: 300, avgScore: 8.2, topScore: 9.1, trend: '+0.2' },
            { name: 'Computer Engineering', students: 220, avgScore: 7.8, topScore: 8.8, trend: '+0.1' },
            { name: 'Information Technology', students: 180, avgScore: 7.5, topScore: 8.5, trend: '+0.3' },
        ]
    },
    {
        name: 'Mahidol University',
        totalStudents: 750,
        avgOverallScore: 8.0,
        departments: [
            { name: 'ICT', students: 350, avgScore: 8.3, topScore: 9.8, trend: '+0.4' },
            { name: 'Computer Engineering', students: 200, avgScore: 7.7, topScore: 8.9, trend: '+0.1' },
            { name: 'Biomedical Engineering', students: 150, avgScore: 7.9, topScore: 8.7, trend: '+0.2' },
        ]
    },
    {
        name: 'Chiang Mai University',
        totalStudents: 680,
        avgOverallScore: 7.7,
        departments: [
            { name: 'Computer Science', students: 280, avgScore: 7.9, topScore: 8.8, trend: '+0.2' },
            { name: 'Computer Engineering', students: 200, avgScore: 7.6, topScore: 8.5, trend: '+0.1' },
            { name: 'Software Engineering', students: 120, avgScore: 7.5, topScore: 8.3, trend: '+0.3' },
        ]
    },
]

async function createOrGetUser(email, displayName) {
    try {
        const user = await auth.getUserByEmail(email)
        console.log(`  ✓ User exists: ${email} (${user.uid})`)
        return user.uid
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const user = await auth.createUser({ email, password: DEFAULT_PASSWORD, displayName })
            console.log(`  + Created user: ${email} (${user.uid})`)
            return user.uid
        }
        throw e
    }
}

async function seed() {
    console.log('🚀 Starting seed...\n')

    // ─── 1. Create Candidates ─────────────────────────────────────
    console.log('📋 Creating Candidates...')
    for (const c of candidateData) {
        const uid = await createOrGetUser(c.email, c.displayName)
        // Create userRoles entry
        await db.collection('userRoles').doc(uid).set({
            uid, email: c.email, displayName: c.displayName, role: 'candidate',
            companyName: '', universityName: '', timestamp: FieldValue.serverTimestamp()
        }, { merge: true })
        // Create candidates entry
        const numericValues = Object.values(c.scores).filter(v => typeof v === 'number')
        const overall = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        await db.collection('candidates').doc(uid).set({
            uid, name: c.displayName, email: c.email, title: c.title, university: c.university,
            department: c.department, skills: c.skills, tier: c.tier,
            scores: { ...c.scores, overall: Math.round(overall * 10) / 10 },
            interviewCount: Math.floor(Math.random() * 30) + 5,
            lastActive: 'Recently',
        }, { merge: true })
        // Create interviewScores entry
        await db.collection('interviewScores').doc(uid + '_latest').set({
            userId: uid, displayName: c.displayName, scores: c.scores,
            summary: `${c.displayName} demonstrated strong ${c.title} capabilities.`,
            overall: Math.round(overall * 10) / 10, mode: 'virtual',
            timestamp: FieldValue.serverTimestamp()
        }, { merge: true })
    }

    // ─── 2. Create Employers ──────────────────────────────────────
    console.log('\n🏢 Creating Employers...')
    for (const e of employerData) {
        const uid = await createOrGetUser(e.email, e.displayName)
        await db.collection('userRoles').doc(uid).set({
            uid, email: e.email, displayName: e.displayName, role: 'enterprise',
            companyName: e.companyName, universityName: '', timestamp: FieldValue.serverTimestamp()
        }, { merge: true })
    }

    // ─── 3. Create University Admins ──────────────────────────────
    console.log('\n🏛️ Creating University Admins...')
    for (const u of universityAdminData) {
        const uid = await createOrGetUser(u.email, u.displayName)
        await db.collection('userRoles').doc(uid).set({
            uid, email: u.email, displayName: u.displayName, role: 'university',
            companyName: '', universityName: u.universityName, timestamp: FieldValue.serverTimestamp()
        }, { merge: true })
    }

    // ─── 4. Create Super Admin ────────────────────────────────────
    console.log('\n🛡️ Creating Super Admin...')
    const adminUid = await createOrGetUser('admin@aiinterview.com', 'Super Admin')
    await db.collection('userRoles').doc(adminUid).set({
        uid: adminUid, email: 'admin@aiinterview.com', displayName: 'Super Admin', role: 'admin',
        companyName: '', universityName: '', timestamp: FieldValue.serverTimestamp()
    }, { merge: true })

    // ─── 5. Create Universities Collection ────────────────────────
    console.log('\n🏫 Creating Universities...')
    for (const uni of universityCollections) {
        const existing = await db.collection('universities').where('name', '==', uni.name).get()
        if (existing.empty) {
            await db.collection('universities').add(uni)
            console.log(`  + Created: ${uni.name}`)
        } else {
            await db.collection('universities').doc(existing.docs[0].id).set(uni, { merge: true })
            console.log(`  ✓ Updated: ${uni.name}`)
        }
    }

    // ─── 6. Create Positions Collection ──────────────────────────
    console.log('\n💼 Creating Job Positions...')
    const titles = [
        'Full-Stack Developer', 'Frontend Developer', 'Backend Engineer',
        'UX/UI Designer', 'Data Scientist', 'AI/ML Engineer',
        'DevOps Engineer', 'Mobile Developer', 'Cloud Architect', 'Product Manager'
    ]
    for (const title of titles) {
        const existing = await db.collection('positions').where('title', '==', title).get()
        if (existing.empty) {
            await db.collection('positions').add({ title: title, createdAt: FieldValue.serverTimestamp() })
            console.log(`  + Created: ${title}`)
        } else {
            console.log(`  ✓ Exists: ${title}`)
        }
    }

    console.log('\n✅ Seed completed! All accounts use password: password123')
    console.log('\n📧 Account Summary:')
    console.log('  Candidates: somchai@example.com, ploy@example.com, nattapong@example.com, etc.')
    console.log('  Employers:  employer1@techcorp.com, employer2@innovate.com')
    console.log('  University: admin@chula.ac.th, admin@kmutt.ac.th, etc.')
    console.log('  Admin:      admin@aiinterview.com')
}

seed().catch(console.error).finally(() => process.exit())
