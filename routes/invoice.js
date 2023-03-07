const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice');


router.post('/create-invoice', invoiceController.createInvoice);
router.put('/update-invoice/:id', invoiceController.updateInvoice);

router.get("/user/:userId", invoiceController.getInvoicesByUser);
router.get("/:userId/count", invoiceController.getInvoiceCount);
router.get('/invoice-totals/:userId', async (req, res) => {
    try {
      const totals = await invoiceController.getInvoiceTotalsByUser(req.params.userId);
      res.status(200).json(totals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;
