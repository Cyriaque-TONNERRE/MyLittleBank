const express = require('express');
const router = express.Router();
const pool = require('../db');

// Création de compte
router.post('/account', (req, res) => {
    let balance = req.body.balance;

    if (typeof balance !== 'number' || balance < 0) {
        return res.status(400).send();
    }

    pool.query('INSERT INTO comptes (solde) VALUES (?)', [balance]).then(
        result => {
            console.log('Compte créé avec succès', result);
            res.status(200).json({
                account: Number(result.insertId),
                currency: 'EUR',
                balance: balance
            });
        }
    ).catch(
        err => {
            console.error('Erreur lors de la création du compte', err);
            res.status(500).send();
        }
    );
});

// Récupération du solde
router.get('/account/:account/balance', (req, res) => {
    const accountId = Number(req.params.account);

    if (isNaN(accountId)) {
        return res.status(400).send();
    }
    if (accountId < 100000 || accountId > 999999) {
        return res.status(400).send();
    }

    pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [accountId]).then(
        result => {
            if (result.length === 0) {
                return res.status(404).send();
            }

            res.status(200).json({
                account: accountId,
                currency: 'EUR',
                balance: result[0].solde
            });
        }
    ).catch(
        err => {
            console.error('Erreur lors de la récupération du solde', err);
            res.status(500).send();
        }
    );
});

// Détails du compte
router.get('/account/:account/details', (req, res) => {
    const accountId = Number(req.params.account);

    if (isNaN(accountId)) {
        return res.status(400).send();
    }
    if (accountId < 100000 || accountId > 999999) {
        return res.status(400).send();
    }

    pool.query('SELECT * FROM comptes WHERE id_compte = ?', [accountId]).then(
        result => {
            // On recupere les 50 dernieres operations
            pool.query('SELECT * FROM transactions WHERE (source = ? or destination = ?) ORDER BY date_transaction DESC LIMIT 50', [accountId, accountId]).then(
                operations => {
                    res.status(200).json({
                        account: accountId,
                        currency: result[0].currency,
                        balance: result[0].solde,
                        operations: operations
                    });
                }
            ).catch(
                err => {
                    console.error('Erreur lors de la récupération des opérations', err);
                    res.status(500).send();
                }
            );
        }
    ).catch(
        err => {
            console.error('Erreur lors de la récupération des détails du compte', err);
            res.status(500).send();
        }
    );

});

// Transfert d'argent
router.post('/account/:account/transfer', (req, res) => {
    const senderId = Number(req.params.account);
    let { amount, currency, label, recipient } = req.body;

    recipient = Number(recipient);

    // Validation
    if (!amount || !currency || !label || !recipient ||
        typeof amount !== 'number' || amount <= 0 ||
        typeof currency !== 'string' || currency.length !== 3 ||
        typeof label !== 'string' ||
        typeof recipient !== 'number') {
        return res.status(400).send();
    }

    if (senderId < 100000 || senderId > 999999 || recipient < 100000 || recipient > 999999) {
        return res.status(400).send();
    }
    pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [senderId]).then(
        sender => {
            if (sender.length === 0) {
                return res.status(404).send();
            }

            pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [recipient]).then(
                receiver => {
                    if (receiver.length === 0) {
                        return res.status(404).send();
                    }

                    if (sender[0].solde < amount) {
                        return res.status(400).send();
                    }

                    if (recipient.toString().startsWith('2')) {
                        // On ajoute le montant du transfert au compte
                        console.log('Transfert vers un compte interne' + amount);

                        pool.query('UPDATE comptes SET solde = ? WHERE id_compte = ?', [receiver[0]+ amount, recipient]).then(
                            () => {
                                console.log('Crédit effectué avec succès' + amount);
                                // On retire le montant du transfert du compte
                                pool.query('UPDATE comptes SET solde = ? WHERE id_compte = ?', [sender[0] - amount, senderId]).then(
                                    () => {
                                        console.log('Débit effectué avec succès' + amount);
                                        // On enregistre la transaction
                                        pool.query('INSERT INTO transactions (source, destination, montant, label) VALUES (?, ?, ?, ?)', [senderId, recipient, amount, label]).then(
                                            () => {
                                                console.log('Transfert effectué avec succès')
                                                res.status(200).send();
                                            }).catch( err => {
                                            console.error('Erreur lors de l\'enregistrement de la transaction', err);
                                            res.status(500).send();
                                        });
                                    }).catch( err => {
                                    console.error('Erreur lors de la débit du compte', err);
                                    res.status(500).send();
                                });

                            }
                        ).catch(
                            err => {
                                console.error('Erreur lors de la créditation du compte', err);
                                res.status(500).send();
                            }
                        );
                    } else {
                        // TODO: Transfert vers un compte externe
                    }
                }).catch(
                err => {
                    console.error('Erreur lors de la récupération du destinataire', err);
                    res.status(500).send();
                }
            );
        }).catch(
        err => {
            console.error('Erreur lors de la récupération de l\'expéditeur', err);
            res.status(500).send();
        }
    );

});

module.exports = router;