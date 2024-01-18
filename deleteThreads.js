const User = require('./models/user'); // Adjust the path as needed

async function deleteAllThreadIds() {
    try {
        await User.updateMany({}, { $unset: { openaiThreadId: "" } });
        console.log("Successfully deleted all thread IDs.");
    } catch (error) {
        console.error(`Error deleting all thread IDs: ${error}`);
    }
}

deleteAllThreadIds();