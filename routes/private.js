const express = require('express');
const router = express.Router();
const pool = require('../db');

// Verifier l'existence du compte
router.get('/account/:account/exists', async (req, res) => {
    const accountId = Number(req.params.account);

    if (isNaN(accountId)) {
        return res.status(400).send();
    }
    if (accountId < 100000 || accountId > 999999) {
        return res.status(400).send();
    }

    pool.query('SELECT COUNT(*) AS count FROM comptes WHERE id_compte = ?', [accountId]).then(
        result => {
            if (result[0].count === 0) {
                return res.status(404).send();
            }

            res.status(200).send();
        }
    ).catch(
        err => {
            console.error('Erreur lors de la vérification de l\'existence du compte', err);
            res.status(500).send();
        }
    );
});

// Verifier si une devise est supportée
router.get('/currency/:currency/supported', (req, res) => {

    return res.status(501).send();

    const currency = req.params.currency;

    pool.query('SELECT COUNT(*) AS count FROM currency_rates WHERE currency = ?', [currency]).then(
        result => {
            if (result[0].count === 0) {
                return res.status(404).send();
            }

            res.status(200).send();
        }
    ).catch(
        err => {
            console.error('Erreur lors de la vérification de la devise supportée', err);
            res.status(500).send();
        }
    );
});

// Fixer le taux de change
router.post('/currency/:currency/rate', (req, res) => {

    return res.status(501).send();

    const currency = req.params.currency;

    if (typeof req.body.rate !== 'number' || req.body.rate <= 0) {
         return res.status(400).send();
    }
    if (req.body.currency === undefined) {
        return res.status(400).send();
    }

    // On verifie si la devise req.body.currency existe deja.
    // Si elle existe, on recupere son taux de change
    // Et on ajoute currency en tant que nouvelle devise avec req.body.rate fois le taux de change de req.body.currency
    // Si elle n'existe pas, on renvoie une erreur 400
    pool.query('SELECT rate FROM currency_rates WHERE currency = ?', [req.body.currency]).then(
        result => {
            if (result.length === 0) {
                return res.status(400).send();
            }

            pool.query('INSERT INTO currency_rates (currency, rate) VALUES (?, ?)', [currency, req.body.rate * result[0].rate]).then(
                result => {
                    console.log('Taux de change fixé avec succès', result);
                    res.status(200).send();
                }
            ).catch(
                err => {
                    console.error('Erreur lors de la fixation du taux de change', err);
                    res.status(500).send();
                }
            );
        }
    ).catch(
        err => {
            console.error('Erreur lors de la récupération du taux de change', err);
            res.status(500).send();
        }
    );

});

// Transaction par carte
router.post('/transaction/card', (req, res) => {
    let { sourceAccount, destAccount, currency, amount, merchant } = req.body;

    // Validation
    if (!sourceAccount || !destAccount || !currency || !amount || !merchant ||
        typeof sourceAccount !== 'number' || sourceAccount < 100000 || sourceAccount > 999999 ||
        typeof destAccount !== 'number' || destAccount < 100000 || destAccount > 999999 ||
        typeof currency !== 'string' || currency.length !== 3 ||
        typeof amount !== 'number' || amount <= 0 ||
        typeof merchant !== 'string') {
        return res.status(400).send();
    }


    if (sourceAccount < 200000 || sourceAccount > 299999) {
        return res.status(404).send();
    }
    pool.query('SELECT rate FROM currency_rates WHERE currency = ?', [currency]).then(
        result => {
            if (result.length === 0) {
                return res.status(406).send();
            }
            amount = amount * result[0].rate;
            pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [sourceAccount]).then(
                sender => {
                    if (sender.length === 0) {
                        return res.status(404).send();
                    }

                    pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [destAccount]).then(
                        receiver => {
                            if (receiver.length === 0) {
                                return res.status(404).send();
                            }

                            if (sender[0].solde < amount) {
                                return res.status(400).send();
                            }

                            if (recipient.toString().startsWith('2')) {
                                // On ajoute le montant du transfert au compte
                                pool.query('UPDATE comptes SET solde = solde + ? WHERE id_compte = ?', [amount, destAccount]).then(
                                    () => {
                                        // On retire le montant du transfert du compte
                                        pool.query('UPDATE comptes SET solde = solde - ? WHERE id_compte = ?', [amount, sourceAccount]).then(
                                            () => {
                                                // On enregistre la transaction
                                                pool.query('INSERT INTO transactions (source, destination, montant, label) VALUES (?, ?, ?, ?)', [sourceAccount, destAccount, amount, merchant]).then(
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
        }).catch(
        err => {
            console.error('Erreur lors de la conversion de la devise', err);
            res.status(500).send();
        }
    );
});

// Transaction par carte
router.post('/transaction/check', (req, res) => {
    let { sourceAccount, destAccount, currency, amount } = req.body;

    // Validation
    if (!sourceAccount || !destAccount || !currency || !amount ||
        typeof sourceAccount !== 'number' || sourceAccount < 100000 || sourceAccount > 999999 ||
        typeof destAccount !== 'number' || destAccount < 100000 || destAccount > 999999 ||
        typeof currency !== 'string' || currency.length !== 3 ||
        typeof amount !== 'number' || amount <= 0 ) {
        return res.status(400).send();
    }

    if (sourceAccount < 200000 || sourceAccount > 299999) {
        return res.status(404).send();
    }

    pool.query('SELECT rate FROM currency_rates WHERE currency = ?', [currency]).then(
        result => {
            if (result.length === 0) {
                return res.status(406).send();
            }
            amount = amount * result[0].rate;
            pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [sourceAccount]).then(
                sender => {
                    if (sender.length === 0) {
                        return res.status(404).send();
                    }

                    pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [destAccount]).then(
                        receiver => {
                            if (receiver.length === 0) {
                                return res.status(404).send();
                            }

                            if (sender[0].solde < amount) {
                                return res.status(400).send();
                            }

                            if (recipient.toString().startsWith('2')) {
                                // On ajoute le montant du transfert au compte
                                pool.query('UPDATE comptes SET solde = solde + ? WHERE id_compte = ?', [amount, destAccount]).then(
                                    () => {
                                        // On retire le montant du transfert du compte
                                        pool.query('UPDATE comptes SET solde = solde - ? WHERE id_compte = ?', [amount, sourceAccount]).then(
                                            () => {
                                                // On enregistre la transaction
                                                pool.query('INSERT INTO transactions (source, destination, montant, label) VALUES (?, ?, ?, ?)', [sourceAccount, destAccount, amount, "Remise Chèque(s)"]).then(
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
        }).catch(
        err => {
            console.error('Erreur lors de la conversion de la devise', err);
            res.status(500).send();
        }
    );
});

router.post('/transaction/transfer', (req, res) => {
    let { sourceAccount, destAccount, currency, amount, label } = req.body;

    // Validation
    if (!sourceAccount || !destAccount || !currency || !amount || !label ||
        typeof sourceAccount !== 'number' || sourceAccount < 100000 || sourceAccount > 999999 ||
        typeof destAccount !== 'number' || destAccount < 100000 || destAccount > 999999 ||
        typeof currency !== 'string' || currency.length !== 3 ||
        typeof amount !== 'number' || amount <= 0 ||
        typeof label !== 'string'
    ) {
        return res.status(400).send();
    }

    if (sourceAccount < 200000 || sourceAccount > 299999) {
        return res.status(404).send();
    }

    pool.query('SELECT rate FROM currency_rates WHERE currency = ?', [currency]).then(
        result => {
            if (result.length === 0) {
                return res.status(406).send();
            }
            amount = amount * result[0].rate;
            pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [sourceAccount]).then(
                sender => {
                    if (sender.length === 0) {
                        return res.status(404).send();
                    }

                    pool.query('SELECT solde FROM comptes WHERE id_compte = ?', [destAccount]).then(
                        receiver => {
                            if (receiver.length === 0) {
                                return res.status(404).send();
                            }

                            if (sender[0].solde < amount) {
                                return res.status(400).send();
                            }

                            if (recipient.toString().startsWith('2')) {
                                // On ajoute le montant du transfert au compte
                                pool.query('UPDATE comptes SET solde = solde + ? WHERE id_compte = ?', [amount, destAccount]).then(
                                    () => {
                                        // On retire le montant du transfert du compte
                                        pool.query('UPDATE comptes SET solde = solde - ? WHERE id_compte = ?', [amount, sourceAccount]).then(
                                            () => {
                                                // On enregistre la transaction
                                                pool.query('INSERT INTO transactions (source, destination, montant, label) VALUES (?, ?, ?, ?)', [sourceAccount, destAccount, amount, label]).then(
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
        }).catch(
        err => {
            console.error('Erreur lors de la conversion de la devise', err);
            res.status(500).send();
        }
    );
});


module.exports = router;