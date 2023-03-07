const getWalletInfo = async (req, res) => {
    const { userId } = req.body;

    //validate request
    if (!userId) {
        return res.status(400).json({ error: "Invalid request" });
    }

    //retrieve user's current balance
    const user = await User.findById(userId);
    const { balance } = user.wallet;

    //send response
    return res.json({ balance });
};
