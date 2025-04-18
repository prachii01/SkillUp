# SkillUp - Gamified Learning Platform

## Introduction
SkillUp : A dynamic web-based platform for interactive quizzes, leaderboards, and user profiles. Built with HTML, CSS, and JavaScript, SkillUp helps users test their knowledge, track progress, and compete with others in real time. Perfect for learning, practicing, and having fun!

## Project Type
Frontend

## Directory Structure
```
SkillUp/
├─ assets/         # Images, icons, and other static assets
├─ css/            # Stylesheet files
├─ data/          # Data files and configurations
├─ js/            # JavaScript modules and utilities
├─ pages/         # HTML pages for different sections
```

## Features
- 🎮 **Gamified User Interface**: RPG-themed design with levels, achievements, and rewards
- 🔐 **Secure Authentication**: 
  - Email/Password login
  - Google Sign-in integration
  - Password recovery system
- 👤 **User Profiles**: 
  - Customizable user profiles
  - Progress tracking
  - Achievement badges
- 📊 **Leaderboard System**:
  - Weekly, monthly, and all-time rankings
  - Point-based progression
  - Competitive elements
- 📱 **Responsive Design**: Works seamlessly across desktop and mobile devices
- ⚔️ **Quest System**: Learning tasks presented as gaming quests
- 🏆 **Achievement System**: Rewards for completing learning milestones

## Design Decisions & Assumptions
1. **Gaming Theme**: Adopted a medieval/RPG theme to enhance engagement
2. **Firebase Integration**: 
   - Used Firebase for authentication and real-time database
   - Assumes stable internet connection for real-time features
3. **Progressive Learning**: 
   - Level-based system for structured learning progression
   - Points system to encourage continuous engagement
4. **User Experience**:
   - Animated elements for visual feedback
   - Loading states for better user experience
   - Error handling with user-friendly messages

## Installation & Getting Started
1. Clone the repository
```bash
git clone https://github.com/yourusername/skillup.git
cd skillup
```

2. Set up Firebase Configuration
- Create a new Firebase project
- Enable Authentication (Email/Password and Google Sign-in)
- Set up Realtime Database
- Add your Firebase configuration in `js/config.js`

3. Configure Firebase Authentication
- Add your domain to Firebase Auth domains in Firebase Console
- Set up Google Sign-in credentials

4. Run the application
- Use a local server (e.g., Live Server VS Code extension)
- Open index.html in your browser

## Credentials
For testing purposes:
- Email: test@skillup.com
- Password: Test@123

## Technology Stack
- **Frontend**:
  - HTML5
  - CSS3 (Custom styling)
  - JavaScript (ES6+)
  - Font Awesome (Icons)

- **Backend Services**:
  - Firebase Authentication
  - Firebase Realtime Database

- **External Libraries**:
  - Firebase SDK v11.6.0
  - Font Awesome v6.0.0

## Future Enhancements
1. Multiplayer quests and challenges
2. Real-time chat system
3. Custom achievement creation
4. Mobile app version
5. Integration with external learning resources

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Notes
- The application requires JavaScript to be enabled
- Pop-ups should be allowed for Google Sign-in functionality
- Internet connection required for authentication and real-time features
