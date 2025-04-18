// syncLeaderboardToUsers.js
// This script will auto-sync leaderboard and users every time the page loads!

// syncLeaderboardToUsers.js
// Use Firebase db, ref, get, update from window (set in config.js)
const db = window.db;
const ref = window.ref;
const get = window.get;
const update = window.update;

async function syncLeaderboardToUsers() {
    if (!db) {
        console.error('Firebase db is not defined. Make sure config.js is loaded first.');
        return;
    }
    const leaderboardRef = ref(db, 'leaderboard');
    try {
        const snapshot = await get(leaderboardRef);
        if (!snapshot.exists()) {
            console.error('No leaderboard data found.');
            return;
        }
        const leaderboard = snapshot.val();
        const updatePromises = [];
        for (const uid in leaderboard) {
            const lb = leaderboard[uid];
            if (!lb) continue;
            const userUpdate = update(ref(db, `users/${uid}`), {
                level: lb.level,
                totalPoints: lb.points,
                allTimePoints: lb.points
            }).then(() => {
                console.log(`Synced user ${uid}: level=${lb.level}, points=${lb.points}`);
            }).catch(err => {
                console.error(`Failed to update user ${uid}:`, err);
            });
            updatePromises.push(userUpdate);
        }
        await Promise.all(updatePromises);
        console.log('All users synced from leaderboard!');
    } catch (error) {
        console.error('Error syncing leaderboard to users:', error);
    }
}

// Expose to window for manual triggering (optional)
window.syncLeaderboardToUsers = syncLeaderboardToUsers;

// AUTO RUN ON PAGE LOAD
syncLeaderboardToUsers();
