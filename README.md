# Quote & Invoice Buddy

BRIEF PRODUIT & SPÉCIFICATION TECHNIQUE

Application de devis et facturation pour artisan indépendant

1. VISION DU PRODUIT

Créer une application web SaaS simple, rapide et professionnelle destinée aux artisans indépendants, en particulier les électriciens, plombiers, techniciens, installateurs et autres professionnels qui réalisent des prestations chez des clients.

Problème à résoudre

Aujourd’hui, un artisan peut :

discuter avec son client sur WhatsApp ;

préparer un devis manuellement ;

envoyer le devis par WhatsApp ;

recopier ensuite les mêmes informations dans une facture Word ;

perdre du temps à ressaisir les lignes ;

oublier quels clients ont payé ;

ne pas avoir de vision globale de l'argent facturé, encaissé ou encore attendu.

L'application doit supprimer cette double saisie.

Promesse principale

Créer un devis une seule fois, puis transformer ce devis en facture sans jamais ressaisir les lignes.

Le produit doit être pensé comme un outil de travail quotidien, pas comme un simple générateur de documents.

2. OBJECTIF DU MVP

L'application doit permettre à un artisan authentifié de :

créer son compte ;

se connecter ;

gérer ses clients ;

créer un devis ;

ajouter plusieurs lignes de prestations ;

calculer automatiquement les montants ;

générer un PDF professionnel ;

partager un lien public de consultation ;

permettre au client de consulter le devis sans compte ;

transformer un devis accepté en facture en un clic ;

conserver exactement les mêmes lignes lors de la transformation ;

verrouiller le contenu d'une facture créée depuis un devis ;

suivre le statut de paiement ;

marquer une facture comme payée ;

visualiser les montants facturés, encaissés et en attente ;

filtrer les données du dashboard sur une période donnée.

3. PRINCIPES PRODUIT NON NÉGOCIABLES

L'application doit respecter les principes suivants.

3.1 Zéro ressaisie

Une facture créée à partir d'un devis doit reprendre automatiquement :

le client ;

la désignation de chaque ligne ;

la quantité ;

le prix unitaire ;

le montant de chaque ligne ;

le total.

L'utilisateur ne doit jamais devoir recopier les informations.

3.2 Source de vérité

Les données enregistrées en base constituent la source de vérité.

Les totaux ne doivent jamais être calculés uniquement côté interface.

Les montants doivent être recalculés et validés côté serveur.

3.3 Facture immuable

Une facture générée à partir d'un devis doit être verrouillée.

Son contenu ne peut plus être modifié.

Cela concerne notamment :

client ;

lignes ;

quantité ;

prix unitaire ;

désignation ;

montant ;

total.

Le statut de paiement reste modifiable.

3.4 Calcul monétaire exact

Ne jamais utiliser des calculs monétaires basés directement sur des nombres flottants JavaScript.

Utiliser une représentation monétaire fiable :

numeric/decimal côté PostgreSQL ;

calculs décimaux côté serveur ;

ou représentation en unités monétaires entières si pertinent.

Le total doit être exactement :

SUM(quantity × unit_price)

avec une précision cohérente.

Pour le MVP, les montants sont affichés avec 2 décimales.

Exemple :

2 × 25,00 = 50,00

3 × 15,50 = 46,50

total = 96,50

Le montant affiché dans l'application et celui du PDF doivent être identiques.

4. STACK TECHNIQUE

Utiliser une architecture moderne, simple et maintenable.

Frontend

Next.js

TypeScript

React

Tailwind CSS

composants UI modernes et réutilisables

responsive design

Backend

Utiliser les capacités serveur de Next.js :

Server Actions et/ou Route Handlers selon le besoin ;

validation serveur obligatoire ;

aucune logique métier critique uniquement côté client.

Base de données

PostgreSQL via Neon.

Les informations de connexion seront fournies dans :

.env

Ne jamais hardcoder les clés.

Exemple de variables :

DATABASE_URL=

L'application doit fonctionner avec la variable d'environnement fournie.

ORM

Utiliser un ORM compatible PostgreSQL, de préférence Prisma ou Drizzle.

Le choix doit rester cohérent avec l'écosystème Next.js retenu.

Authentification

Mettre en place une authentification sécurisée permettant :

inscription ;

connexion ;

déconnexion ;

session persistante ;

protection des routes privées.

Un utilisateur ne doit pouvoir accéder qu'à ses propres données.

PDF

Utiliser une solution fiable pour générer les PDF côté serveur.

Le PDF doit être généré à partir des données enregistrées en base.

5. UTILISATEURS ET PERMISSIONS

Le MVP possède deux types d'acteurs :

5.1 Artisan

Utilisateur authentifié.

Il peut :

gérer ses clients ;

créer ses devis ;

consulter ses devis ;

modifier ses devis tant qu'ils ne sont pas verrouillés ;

générer les PDF ;

partager les devis ;

transformer un devis accepté en facture ;

consulter ses factures ;

marquer une facture comme payée ;

consulter son dashboard.

5.2 Client

Le client n'a pas besoin de compte.

Il accède uniquement au devis via un lien public sécurisé.

Il peut :

consulter le devis ;

voir les informations de l'artisan ;

voir ses propres informations ;

voir les lignes ;

voir le total ;

consulter le PDF si prévu par l'interface.

Il ne peut jamais :

modifier le devis ;

modifier les lignes ;

accéder au dashboard ;

voir d'autres clients ;

voir d'autres devis ;

voir les factures internes de l'artisan ;

accéder aux données privées de l'application.

6. STRUCTURE DE LA BASE DE DONNÉES

Concevoir une base PostgreSQL relationnelle propre.

6.1 users

Champs minimum :

id

name

email

password_hash ou mécanisme fourni par le système d'authentification

created_at

updated_at

Chaque utilisateur représente un artisan.

6.2 artisan_profiles

Informations professionnelles de l'artisan.

Champs :

id

user_id

business_name

phone

email

address

city

country

tax_identifier nullable

logo_url nullable

created_at

updated_at

Ces informations servent notamment à générer les PDF.

6.3 clients

Champs :

id

user_id

name

company_name nullable

email nullable

phone nullable

address nullable

city nullable

notes nullable

created_at

updated_at

Un client appartient obligatoirement à un utilisateur.

Un artisan ne peut jamais accéder aux clients d'un autre artisan.

7. DEVIS

7.1 quotes

Champs recommandés :

id

user_id

client_id

quote_number

status

issue_date

valid_until nullable

subtotal

total

public_token

created_at

updated_at

Numéro de devis

Chaque devis doit avoir un identifiant lisible.

Exemple :

DEV-2026-0001

Le système doit générer automatiquement les numéros.

Ils doivent être uniques pour un artisan.

8. STATUTS DU DEVIS

Utiliser des statuts explicites.

DRAFT

Devis en préparation.

SENT

Devis envoyé au client.

ACCEPTED

Devis accepté / validé.

REJECTED

Devis refusé.

CONVERTED

Devis transformé en facture.

9. LIGNES DE DEVIS

Créer une table séparée :

quote_items

Champs :

id

quote_id

description

quantity

unit_price

line_total

position

created_at

Règle

line_total = quantity × unit_price

Le serveur doit recalculer cette valeur.

Ne jamais faire confiance à une valeur envoyée uniquement par le navigateur.

10. CRÉATION D'UN DEVIS

L'interface doit permettre de créer un devis avec :

Informations générales

client ;

date ;

date de validité optionnelle ;

numéro automatique.

Lignes

Chaque ligne contient :

désignation ;

quantité ;

prix unitaire ;

total de ligne.

Actions :

ajouter une ligne ;

supprimer une ligne ;

modifier une ligne ;

réorganiser les lignes si pertinent.

Le formulaire doit afficher le total en temps réel.

Exemple :

DésignationQtéPrix unitaireTotalInstallation prise électrique415 00060 000Câble électrique102 00020 000Main-d'œuvre125 00025 000

Total :

105 000

11. VALIDATION D'UN DEVIS

Un devis ne peut pas être enregistré si :

aucun client n'est sélectionné ;

aucune ligne n'est présente ;

une désignation est vide ;

une quantité est invalide ;

un prix unitaire est négatif ;

les données obligatoires sont absentes.

La quantité doit être strictement supérieure à zéro.

Le prix unitaire doit être supérieur ou égal à zéro.

12. CALCUL DU TOTAL

Pour chaque ligne :

line_total = quantity × unit_price

Puis :

quote_total = somme de toutes les line_total

Le serveur doit recalculer le total avant insertion ou mise à jour.

Le total stocké en base doit correspondre aux lignes.

Une incohérence doit provoquer une erreur plutôt que d'être enregistrée.

13. PDF DU DEVIS

Le bouton :

Télécharger le PDF

doit générer un document professionnel.

Le PDF doit contenir :

En-tête

logo si disponible ;

nom de l'artisan / entreprise ;

téléphone ;

email ;

adresse.

Informations du devis

"DEVIS" ;

numéro ;

date ;

date de validité si renseignée ;

informations du client.

Tableau

Colonnes :

Désignation

Quantité

Prix unitaire

Total

Pied du document

total ;

conditions éventuelles ;

informations professionnelles.

Le PDF doit être propre sur desktop et imprimable.

Le total PDF doit être calculé depuis les données serveur et être identique au total enregistré.

14. PARTAGE DU DEVIS

Chaque devis doit posséder un lien public unique.

Exemple :

/quote/[public_token]

Le token doit être suffisamment aléatoire et impossible à deviner facilement.

Le client peut ouvrir ce lien sans compte.

15. PAGE PUBLIQUE DU DEVIS

La page publique doit afficher :

nom de l'artisan ;

coordonnées professionnelles pertinentes ;

numéro du devis ;

date ;

client ;

lignes ;

quantités ;

prix ;

total ;

date de validité si elle existe ;

statut du devis.

La page est strictement en lecture seule.

Aucun bouton de modification ne doit être présent.

Aucune donnée interne inutile ne doit être exposée.

16. MODIFICATION D'UN DEVIS APRÈS ENVOI

Le brief initial ne précisait pas cette situation.

Décision produit :

Tant que le devis n'est pas transformé en facture :

L'artisan peut modifier le devis.

Si le devis a déjà été envoyé, une modification crée une nouvelle version logique du contenu du devis, mais le lien public reste le même.

La page publique doit toujours afficher la version actuellement enregistrée.

Ajouter une indication visuelle côté artisan :

"Ce devis a déjà été partagé. Toute modification mettra à jour la version visible par le client."

L'objectif est d'éviter qu'un artisan pense avoir envoyé une ancienne version alors que le lien affiche une nouvelle version.

Il n'est pas nécessaire de construire un système complexe de versioning pour le MVP.

17. DATE DE VALIDITÉ

La date de validité est optionnelle.

Un devis peut donc être :

sans date de validité ;

avec une date de validité.

Si une date est renseignée et dépassée, afficher visuellement :

Devis expiré

Cette expiration ne doit pas supprimer le devis.

Elle ne doit pas empêcher l'artisan de le consulter.

Elle peut empêcher ou avertir avant une transformation en facture.

Décision MVP :

Un devis expiré peut être transformé en facture uniquement après confirmation explicite de l'artisan.

Exemple de confirmation :

"Ce devis est expiré depuis le 15 août 2026. Voulez-vous tout de même le transformer en facture ?"

18. TRANSFORMATION DEVIS → FACTURE

Le bouton principal :

Transformer en facture

doit être disponible pour un devis accepté.

Lorsqu'il est déclenché :

récupérer le devis ;

récupérer toutes ses lignes ;

créer une facture ;

recopier toutes les informations ;

recopier toutes les lignes ;

recalculer les montants ;

associer la facture au devis d'origine ;

changer le statut du devis en CONVERTED ;

verrouiller le contenu de la facture.

Aucune ressaisie.

19. FACTURES

Créer une table :

invoices

Champs minimum :

id

user_id

client_id

quote_id nullable

invoice_number

status

issue_date

subtotal

total

paid_at nullable

created_at

updated_at

Numéro :

FAC-2026-0001

Le numéro doit être unique pour l'artisan.

20. LIGNES DE FACTURE

Créer :

invoice_items

Champs :

id

invoice_id

description

quantity

unit_price

line_total

position

Lorsqu'une facture est créée à partir d'un devis :

quote_items → invoice_items

Chaque ligne doit être copiée fidèlement.

Aucune modification manuelle ne doit être possible après création.

21. IMMUTABILITÉ DE LA FACTURE

Une facture créée depuis un devis est verrouillée.

Interdire :

modification du client ;

modification des lignes ;

modification des quantités ;

modification des prix ;

modification du total ;

suppression des lignes.

Toute tentative côté interface doit être impossible.

Toute tentative directe côté API doit également être bloquée côté serveur.

Ne jamais compter uniquement sur le frontend pour cette règle.

22. STATUTS DE FACTURE

Minimum :

UNPAID

Facture non payée.

PAID

Facture payée.

Prévoir une architecture permettant d'ajouter ultérieurement :

PARTIALLY_PAID

OVERDUE

CANCELLED

mais ne pas implémenter inutilement ces états dans le MVP si cela complexifie le produit.

23. PAIEMENT

Sur la facture, afficher clairement :

Statut : En attente

Bouton :

Marquer comme payée

Après confirmation :

statut → PAID

paid_at est renseigné ;

le dashboard est immédiatement mis à jour ;

le changement persiste après actualisation de la page.

Une facture payée peut être repassée en impayée uniquement si cette fonctionnalité est explicitement prévue.

Pour le MVP :

prévoir une action "Annuler le paiement" avec confirmation afin de corriger une erreur de marquage.

Cette action ne modifie jamais le contenu de la facture.

24. DASHBOARD

Le dashboard est la page principale après connexion.

Il doit donner une vision immédiate de l'activité financière.

KPI principaux

Afficher :

Montant total facturé

Somme des factures créées pendant la période sélectionnée.

Montant encaissé

Somme des factures ayant le statut PAID.

Montant en attente

Somme des factures ayant le statut UNPAID.

La relation doit être :

total facturé = encaissé + en attente

pour les factures concernées par la période.

25. FILTRE DE PÉRIODE

Le dashboard doit permettre de sélectionner :

aujourd'hui ;

cette semaine ;

ce mois ;

ce trimestre ;

cette année ;

période personnalisée.

Par défaut :

Ce mois

La période doit être clairement affichée.

Exemple :

1 août 2026 → 20 août 2026

26. CALCUL DU DASHBOARD

Les chiffres doivent être calculés à partir des vraies factures présentes en base.

Ne jamais utiliser de données fictives pour remplir les KPI une fois l'application connectée.

Exemple :

Factures du mois :

FAC-001 : 100 000 — payée

FAC-002 : 150 000 — impayée

FAC-003 : 50 000 — payée

Résultat :

Total facturé : 300 000

Encaissé : 150 000

En attente : 150 000

27. LISTE DES DEVIS

Créer une page :

/quotes

Afficher un tableau ou une liste contenant :

numéro ;

client ;

date ;

montant ;

statut ;

validité ;

actions.

Actions possibles :

consulter ;

modifier ;

télécharger PDF ;

copier le lien ;

transformer en facture.

Ajouter :

recherche ;

filtre par statut ;

filtre de date si pertinent.

28. LISTE DES FACTURES

Créer :

/invoices

Afficher :

numéro ;

client ;

date ;

montant ;

statut paiement ;

date de paiement ;

actions.

Actions :

consulter ;

télécharger PDF ;

marquer comme payée ;

annuler le statut payé si nécessaire.

Aucune action de modification du contenu ne doit apparaître.

29. LISTE DES CLIENTS

Créer :

/clients

Fonctionnalités :

liste des clients ;

recherche ;

création ;

modification ;

consultation ;

suppression si le client n'est pas lié à des documents empêchant raisonnablement sa suppression.

Lorsqu'un client possède des devis ou factures, privilégier une suppression logique ou empêcher la suppression afin de préserver l'historique.

30. FICHE CLIENT

Afficher :

nom ;

entreprise ;

téléphone ;

email ;

adresse ;

notes ;

nombre de devis ;

nombre de factures ;

montant facturé ;

montant payé ;

montant restant.

Afficher également l'historique :

Devis

Liste des devis du client.

Factures

Liste des factures du client.

31. NAVIGATION

Navigation principale :

Dashboard

Devis

Factures

Clients

Paramètres

En haut ou dans la zone utilisateur :

nom de l'utilisateur ;

profil ;

déconnexion.

32. PARAMÈTRES

Créer une page de paramètres permettant de gérer :

Profil professionnel

nom ;

entreprise ;

téléphone ;

email ;

adresse ;

logo ;

identifiant fiscal si nécessaire.

Ces informations doivent être utilisées dans les futurs PDF.

33. DESIGN / UX

L'application doit avoir une apparence :

moderne ;

professionnelle ;

claire ;

minimaliste ;

orientée productivité ;

extrêmement lisible.

Éviter l'apparence d'un logiciel administratif vieillissant.

L'interface doit donner une impression de :

"Je peux gérer toute ma facturation en quelques clics."

34. RESPONSIVE

L'application doit fonctionner correctement sur :

desktop ;

tablette ;

mobile.

L'artisan peut travailler depuis son ordinateur ou son téléphone.

Le dashboard doit notamment être utilisable sur mobile.

Les tableaux complexes doivent devenir des cartes ou listes adaptées aux petits écrans.

35. UX DE CRÉATION D'UN DEVIS

La création doit être extrêmement rapide.

Parcours idéal :

Nouveau devis

→ sélectionner client

→ ajouter lignes

→ voir total

→ enregistrer

→ générer PDF / partager

L'utilisateur ne doit pas être noyé dans des champs inutiles.

36. ACTIONS PRINCIPALES

Les actions importantes doivent être facilement identifiables.

Exemples :

Nouveau devis

Télécharger PDF

Partager

Transformer en facture

Marquer comme payée

Éviter de cacher les actions principales dans des menus secondaires.

37. FEEDBACK UTILISATEUR

Après chaque action importante, afficher un feedback clair.

Exemples :

Devis créé avec succès.

Lien du devis copié.

PDF généré.

Facture créée avec succès.

Facture marquée comme payée.

En cas d'erreur :

Impossible d'enregistrer le devis. Vérifiez les informations saisies.

Ne jamais afficher des erreurs techniques incompréhensibles à l'utilisateur.

38. CONFIRMATIONS

Les opérations sensibles nécessitent une confirmation.

Transformation en facture

Afficher :

"Cette action créera une facture définitive à partir de ce devis. Le contenu de la facture ne pourra plus être modifié. Continuer ?"

Suppression

Demander confirmation.

Marquer comme payée

Demander confirmation.

39. SÉCURITÉ

Les règles suivantes sont obligatoires.

Isolation des données

Toutes les requêtes doivent être filtrées par user_id.

Un artisan A ne doit jamais pouvoir consulter les données de l'artisan B.

API

Les permissions doivent être vérifiées côté serveur.

Public token

Les liens publics doivent utiliser des tokens sécurisés et non des IDs séquentiels directement exposés.

Mauvais :

/quote/12

Préférer :

/quote/a8f4d9...

Données sensibles

Ne jamais exposer :

hash de mot de passe ;

données internes ;

IDs inutiles ;

informations d'autres utilisateurs.

40. RÈGLES DE COHÉRENCE

Le système doit empêcher les incohérences suivantes :

Impossible :

Une facture sans client.

Impossible :

Une facture créée depuis un devis mais dont les lignes diffèrent du devis original au moment de la conversion.

Impossible :

Une facture dont le total ne correspond pas aux lignes.

Impossible :

Modifier une facture verrouillée.

Impossible :

Un utilisateur consulter les données d'un autre utilisateur.

Impossible :

Un lien public modifier un devis.

41. TRANSACTION DE CONVERSION

La transformation devis → facture doit être atomique.

Si une étape échoue :

aucune facture partiellement créée ne doit rester ;

le devis ne doit pas être marqué comme converti prématurément.

Utiliser une transaction PostgreSQL/ORM.

Exemple logique :

BEGIN TRANSACTION

1. Vérifier que le devis appartient à l'utilisateur
2. Vérifier son statut
3. Récupérer ses lignes
4. Créer la facture
5. Copier les lignes
6. Calculer le total
7. Vérifier le total
8. Passer le devis à CONVERTED

COMMIT

En cas d'erreur :

ROLLBACK

42. CAS DE DOUBLE CLIC

Si l'utilisateur clique deux fois rapidement sur :

Transformer en facture

le système ne doit pas créer deux factures.

Mettre en place une protection côté serveur.

Un devis CONVERTED ne peut plus être reconverti.

43. ÉTATS VIDES

Prévoir des états vides élégants.

Dashboard sans facture :

Vous n'avez encore aucune facture.

Page devis vide :

Aucun devis pour le moment.

Créez votre premier devis pour commencer.

Clients vide :

Ajoutez votre premier client.

44. DONNÉES DE DÉMONSTRATION

En environnement de développement uniquement, prévoir éventuellement un seed permettant de tester :

1 artisan ;

5 clients ;

plusieurs devis ;

plusieurs factures ;

factures payées et impayées.

Ne pas injecter de données fictives en production.

45. ARCHITECTURE DES ROUTES

Prévoir au minimum :

/
/login
/register

/dashboard

/clients
/clients/new
/clients/[id]

/quotes
/quotes/new
/quotes/[id]

/invoices
/invoices/[id]

/settings

/quote/[public_token]

Les routes privées doivent être protégées.

La route publique /quote/[public_token] doit rester accessible sans authentification.

46. COMPOSANTS RÉUTILISABLES

Créer des composants propres et réutilisables :

Button

Input

Select

Modal

ConfirmDialog

DataTable

StatusBadge

MoneyDisplay

DateDisplay

EmptyState

LoadingState

ErrorState

QuoteForm

QuoteItemsEditor

QuoteSummary

InvoiceSummary

ClientForm

DashboardKpi

DateRangeFilter

Ne pas dupliquer inutilement le code.

47. FORMAT MONÉTAIRE

Le système doit être conçu pour pouvoir supporter différentes devises.

Pour le MVP, utiliser une devise configurable dans le profil de l'artisan.

Valeur par défaut :

XOF

Afficher les montants de façon cohérente.

Exemple :

125 000 FCFA

Ne pas afficher un mélange incohérent entre :

125000

125 000.00

125k

Le format doit être uniforme dans toute l'application et dans les PDF.

48. DATES

Utiliser un format de date cohérent pour l'utilisateur.

Exemple :

20 août 2026

Éviter d'exposer inutilement les formats techniques ISO dans l'interface.

Les données en base doivent cependant être stockées dans un format approprié.

49. PDF FACTURE

Même si le besoin principal concerne le devis, la facture doit également pouvoir être téléchargée en PDF.

Structure :

informations artisan ;

informations client ;

numéro facture ;

date ;

référence du devis d'origine ;

lignes ;

total ;

statut de paiement.

Si payée :

Afficher clairement :

PAYÉE

avec la date de paiement.

50. RÉFÉRENCE DE TRAÇABILITÉ

Une facture issue d'un devis doit garder une référence vers le devis source.

Exemple :

Facture FAC-2026-0008
Issue du devis DEV-2026-0014

Cela permet de retrouver l'origine de la facture.

51. JOURNAL / HISTORIQUE MINIMAL

Pour les événements importants, prévoir une architecture permettant de conserver :

création du devis ;

modification du devis ;

envoi/partage ;

acceptation ;

conversion en facture ;

paiement.

Un système complet d'audit peut être simplifié dans le MVP, mais l'architecture doit pouvoir évoluer vers celui-ci.

52. ACCEPTATION DU DEVIS

Le besoin initial indique qu'un devis accepté devient une facture.

Le MVP doit donc prévoir un moyen clair pour que l'artisan puisse passer un devis à :

ACCEPTED

Cela peut être une action côté artisan :

Marquer comme accepté

Le client public n'a pas besoin de compte.

Ne pas implémenter de signature électronique complexe dans le MVP.

53. PARCOURS COMPLET

Le parcours principal attendu est :

INSCRIPTION
↓
DASHBOARD
↓
CRÉER CLIENT
↓
NOUVEAU DEVIS
↓
AJOUTER PLUSIEURS LIGNES
↓
TOTAL AUTOMATIQUE
↓
ENREGISTRER
↓
GÉNÉRER PDF
↓
COPIER LIEN PUBLIC
↓
ENVOYER AU CLIENT VIA WHATSAPP
↓
CLIENT CONSULTE LE DEVIS
↓
ARTISAN MARQUE LE DEVIS COMME ACCEPTÉ
↓
TRANSFORMER EN FACTURE
↓
FACTURE VERROUILLÉE
↓
CLIENT PAIE
↓
ARTISAN MARQUE LA FACTURE COMME PAYÉE
↓
DASHBOARD MIS À JOUR

54. WHATSAPP

L'application n'a pas besoin d'intégrer l'API WhatsApp dans le MVP.

Le bouton Partager sur WhatsApp peut générer un message prérempli contenant le lien public.

Exemple :

Bonjour [Nom], voici votre devis [DEV-2026-0012].

Vous pouvez le consulter ici :
[lien]

Le navigateur peut ensuite ouvrir WhatsApp avec le message prérempli.

Ne pas demander de connexion à WhatsApp.

55. CE QUI N'EST PAS DANS LE MVP

Ne pas complexifier inutilement la première version.

Ne pas implémenter :

paiement en ligne ;

API WhatsApp Business ;

signature électronique avancée ;

comptabilité complète ;

gestion de stock ;

gestion des achats ;

gestion des fournisseurs ;

multi-entreprises ;

multi-utilisateurs ;

abonnement SaaS ;

notifications SMS ;

notifications email complexes ;

OCR ;

IA ;

application mobile native.

L'architecture doit néanmoins pouvoir évoluer.

56. PERFORMANCE

L'application doit être rapide.

Priorités :

chargement rapide du dashboard ;

formulaires réactifs ;

génération PDF fiable ;

requêtes PostgreSQL optimisées ;

pagination si les listes deviennent importantes.

Ne pas charger inutilement toutes les données en une seule requête.

57. RESPONSABILITÉ FRONTEND / BACKEND

Frontend

Responsable de :

affichage ;

interactions ;

validation UX ;

états de chargement ;

feedback.

Backend

Responsable de :

authentification ;

autorisation ;

validation finale ;

calculs monétaires ;

création des documents ;

verrouillage des factures ;

transactions ;

génération des PDF ;

accès base de données.

Toute règle métier importante doit être appliquée côté serveur.

58. ENVIRONMENT VARIABLES

Toutes les clés et secrets doivent être externalisés.

Créer :

.env.example

avec les variables nécessaires, par exemple :

DATABASE_URL=
AUTH_SECRET=

Ne jamais committer le vrai .env.

L'application doit démarrer avec les variables fournies par l'utilisateur.

59. QUALITÉ DU CODE

Le code généré doit être :

TypeScript strict ;

modulaire ;

lisible ;

maintenable ;

sans duplication inutile ;

sans any sauf nécessité exceptionnelle ;

correctement typé ;

avec gestion des erreurs.

Créer une structure de projet claire.

60. VALIDATION FINALE AVANT LIVRAISON

Avant de considérer l'application comme terminée, tester au minimum :

Authentification

inscription ;

connexion ;

déconnexion ;

protection des routes.

Clients

créer ;

modifier ;

consulter.

Devis

créer un devis ;

ajouter 1 ligne ;

ajouter plusieurs lignes ;

modifier les lignes ;

supprimer une ligne ;

vérifier le total ;

sauvegarder ;

générer PDF.

Partage

générer lien ;

ouvrir le lien sans être connecté ;

vérifier que seule la consultation est possible.

Conversion

accepter un devis ;

convertir en facture ;

vérifier que toutes les lignes sont identiques ;

vérifier le total ;

vérifier le lien devis → facture ;

vérifier qu'une deuxième conversion est impossible.

Verrouillage

tenter de modifier une facture ;

vérifier que l'opération est bloquée côté interface ;

vérifier que l'opération est également bloquée côté serveur.

Paiement

marquer facture comme payée ;

actualiser la page ;

vérifier que le statut reste PAID ;

vérifier paid_at ;

vérifier la mise à jour du dashboard.

Dashboard

Créer plusieurs factures avec différents statuts.

Vérifier :

Total facturé

Total encaissé

Total en attente

et vérifier le filtre par période.

61. CRITÈRES D'ACCEPTATION FINAUX

L'application est considérée comme réussie uniquement si les conditions suivantes sont toutes satisfaites.

AC-01 — Création de devis

Un artisan peut créer un devis contenant plusieurs lignes.

AC-02 — Calcul

Le total est automatiquement calculé et exactement égal à la somme des lignes.

AC-03 — Cohérence PDF

Le total affiché sur le PDF est strictement identique au total affiché dans l'application.

AC-04 — Partage

Un lien public permet au client de consulter le devis sans créer de compte.

AC-05 — Lecture seule

Le lien public ne permet aucune modification.

AC-06 — Modification

Un devis peut être modifié tant qu'il n'est pas transformé en facture.

AC-07 — Conversion

Un devis accepté peut être transformé en facture en une seule action.

AC-08 — Zéro ressaisie

Toutes les lignes du devis sont automatiquement reprises dans la facture.

AC-09 — Fidélité

Aucune ligne, quantité, désignation ou prix ne doit être perdu pendant la conversion.

AC-10 — Verrouillage

Une facture convertie ne peut plus être modifiée.

AC-11 — Protection serveur

Une tentative de modification directe via API est également bloquée.

AC-12 — Paiement

Une facture peut être marquée comme payée.

AC-13 — Persistance

Le statut de paiement reste correct après rechargement.

AC-14 — Dashboard

Le dashboard calcule réellement :

montant total facturé ;

montant encaissé ;

montant en attente.

AC-15 — Période

Les KPI peuvent être filtrés par période.

AC-16 — Isolation

Un utilisateur ne peut jamais accéder aux données d'un autre utilisateur.

AC-17 — Base

Toutes les données persistantes sont stockées dans PostgreSQL via Neon.

AC-18 — Secrets

Les credentials sont lus depuis .env et ne sont jamais hardcodés.

62. INSTRUCTION FINALE À L'AGENT IA

Construis l'application complète à partir de cette spécification.

Ne te limite pas à créer des maquettes ou des écrans statiques.

L'application doit être réellement fonctionnelle de bout en bout :

Frontend → Backend → Authentification → PostgreSQL/Neon → génération PDF → partage public → conversion devis/facture → verrouillage → suivi paiement → dashboard.

Toutes les données importantes doivent être persistées en base.

Toutes les règles métier critiques doivent être vérifiées côté serveur.

Ne crée pas de fonctionnalités fictives ou de boutons qui ne fonctionnent pas.

Ne remplace pas PostgreSQL par une base locale ou mockée.

Ne hardcode aucune donnée métier qui devrait provenir de la base.

Si un choix technique n'est pas explicitement défini dans ce brief, choisir l'option la plus simple, robuste, maintenable et cohérente avec Next.js + TypeScript + PostgreSQL/Neon.

Priorité absolue :

fiabilité des données ;

simplicité d'utilisation ;

zéro ressaisie ;

cohérence devis → facture ;

sécurité ;

expérience utilisateur professionnelle ;

extensibilité.

Le résultat attendu est une application web fonctionnelle et déployable, pas un prototype visuel.

DIRECTION ARTISTIQUE, DESIGN & UX

Construire une expérience SaaS premium et mémorable

Le design est une priorité absolue du projet.

L'application ne doit en aucun cas ressembler à un ERP traditionnel, un logiciel de comptabilité vieillissant ou un simple CRUD avec des tableaux et des formulaires.

Elle doit donner l'impression d'utiliser un produit SaaS moderne, premium, intelligent et extrêmement bien pensé.

L'objectif est de créer un effet :

"Wow, c'est beaucoup plus beau et beaucoup plus simple que ce que j'imaginais."

Le produit doit être suffisamment élégant pour donner envie à l'artisan de l'utiliser tous les jours.

1. PHILOSOPHIE UX

La philosophie générale est :

Complexité invisible. Simplicité visible.

L'application peut avoir une architecture métier complexe en arrière-plan, mais l'utilisateur ne doit jamais avoir l'impression de gérer une base de données.

L'utilisateur doit avoir l'impression de :

créer un devis ;

envoyer un devis ;

transformer un devis en facture ;

suivre son argent.

C'est tout.

Chaque écran doit répondre immédiatement à :

"Qu'est-ce que je dois faire maintenant ?"

2. PRINCIPES UX ABSOLUS

2.1 Peu de clics

Les actions fréquentes doivent être réalisables avec le minimum d'étapes.

Exemple :

Nouveau devis
↓
Choisir client
↓
Ajouter prestations
↓
Enregistrer
↓
Partager

Pas de wizard inutile en 8 étapes.

2.2 Hiérarchie visuelle extrêmement forte

Chaque écran doit avoir :

une action principale ;

des actions secondaires ;

des informations importantes ;

des informations secondaires.

Ne jamais donner le même poids visuel à tous les éléments.

2.3 Affordance évidente

L'utilisateur doit immédiatement comprendre :

ce qui est cliquable ;

ce qui est modifiable ;

ce qui est verrouillé ;

ce qui est terminé ;

ce qui nécessite une action.

2.4 Feedback immédiat

Chaque action doit produire une réponse visuelle.

Exemples :

Après création :

✓ Devis créé

Après partage :

✓ Lien copié

Après conversion :

✓ Facture créée

Après paiement :

✓ Paiement enregistré

Ces feedbacks doivent être élégants, subtils et rapides.

3. DIRECTION VISUELLE

Créer une esthétique :

Premium SaaS + Glassmorphism + Minimalisme + profondeur visuelle.

Références conceptuelles :

interfaces SaaS modernes ;

Apple ;

Linear ;

Raycast ;

Arc ;

Stripe ;

Vercel ;

interfaces financières premium.

Ne pas copier leur design.

S'en inspirer uniquement pour :

la qualité ;

la précision ;

les animations ;

la hiérarchie ;

la sensation de fluidité.

4. GLASSMORPHISME

Le glassmorphisme doit être un élément central de la direction artistique.

Mais il doit être utilisé avec intelligence.

Ne pas transformer toute l'application en panneaux translucides illisibles.

Utiliser plusieurs niveaux de profondeur.

Niveau 1 — Background

Créer un fond doux et légèrement dynamique.

Exemple :

gradient très subtil ;

halos lumineux ;

blobs flous ;

noise/grain extrêmement léger.

Le background doit donner de la profondeur sans distraire.

Niveau 2 — Glass surfaces

Les cartes principales utilisent :

transparence ;

backdrop-filter: blur(...) ;

bordure semi-transparente ;

ombres très douces ;

léger reflet lumineux ;

radius généreux.

Exemple conceptuel :

┌─────────────────────────────────────────┐
│ │
│ GLASS CARD │
│ │
│ background: rgba(...) │
│ backdrop-filter: blur(...) │
│ border: 1px solid rgba(...) │
│ shadow: soft │
│ │
└─────────────────────────────────────────┘

Niveau 3 — Floating elements

Certains éléments peuvent légèrement flotter au-dessus de l'interface :

bouton principal ;

actions rapides ;

notifications ;

menus contextuels ;

modal ;

aperçu du devis.

Ils doivent donner une sensation de profondeur.

5. COULEURS

Créer une palette premium et sobre.

Éviter les interfaces multicolores agressives.

Utiliser principalement :

blanc cassé / blanc ;

gris très clair ;

graphite ;

noir doux ;

une couleur d'accent forte ;

couleurs sémantiques pour les statuts.

Les couleurs de statut doivent être immédiatement compréhensibles :

Payée

Vert.

En attente

Orange / ambre.

Acceptée

Accent positif.

Brouillon

Gris neutre.

Refusée

Rouge discret.

Les couleurs doivent rester élégantes et peu saturées.

6. TYPOGRAPHIE

La typographie doit être extrêmement soignée.

Utiliser une police moderne sans-serif.

Priorités :

excellente lisibilité ;

chiffres très lisibles ;

hiérarchie claire ;

spacing généreux.

Les chiffres financiers doivent avoir une présence visuelle forte.

Exemple :

MONTANT ENCAISSÉ

125 000 FCFA

Le montant doit être immédiatement visible sans prendre toute la page.

7. DASHBOARD — EXPÉRIENCE PREMIUM

Le dashboard est l'écran le plus important.

Il ne doit pas être une simple grille de 3 cartes.

Créer une véritable expérience financière.

Header

Exemple :

Bonjour, Jean.

Voici comment se porte votre activité.

À droite :

période ;

profil ;

actions rapides.

8. HERO FINANCIER

Créer une zone principale avec un grand KPI.

Exemple :

────────────────────────────────────────

        ACTIVITÉ DU MOIS

        450 000 FCFA

        +18,4% vs mois dernier

────────────────────────────────────────

Le montant doit avoir une animation subtile lors du chargement.

9. KPI CARDS

Créer trois cartes glass :

Facturé

450 000 FCFA

Encaissé

320 000 FCFA

En attente

130 000 FCFA

Chaque carte possède :

icône minimaliste ;

montant ;

label ;

évolution éventuelle ;

micro-interaction au hover.

Les cartes ne doivent pas être visuellement plates.

10. VISUALISATION FINANCIÈRE

Ajouter une visualisation élégante permettant de comprendre rapidement :

Facturé vs encaissé

Ne pas utiliser un graphique complexe.

Privilégier :

courbe ;

area chart ;

bar chart minimaliste.

Animation au chargement.

Le graphique doit être agréable à regarder même avec peu de données.

11. ACTION RAPIDE

Créer un bouton principal très visible :

- Nouveau devis

Il doit être accessible depuis :

dashboard ;

liste des devis ;

éventuellement header global.

Sur desktop, il peut être légèrement flottant.

Sur mobile, il peut devenir une action flottante.

12. DEVIS — UX

La page devis doit immédiatement permettre de comprendre :

combien de devis existent ;

combien sont en attente ;

combien sont acceptés ;

combien ont été transformés.

Créer une navigation/filter élégante :

Tous Brouillons Envoyés Acceptés Convertis

avec animation fluide lors du changement.

13. TABLEAU DE DEVIS

Ne pas créer un tableau administratif classique trop dense.

Créer une interface respirante.

Chaque ligne doit afficher :

DEV-2026-0012

Jean Dupont
Installation électrique

105 000 FCFA

Accepté

Les actions apparaissent au hover.

Sur mobile, transformer les lignes en cards.

14. CRÉATION DE DEVIS — EXPÉRIENCE

C'est l'un des écrans les plus importants.

Il doit être pensé comme un workspace de création.

Layout desktop :

┌──────────────────────────────┬──────────────────────────┐
│ │ │
│ FORMULAIRE │ APERÇU │
│ │ │
│ Client │ DEVIS │
│ │ │
│ Prestations │ ... │
│ │ │
│ + Ajouter une ligne │ │
│ │ │
│ │ │
└──────────────────────────────┴──────────────────────────┘

L'utilisateur doit voir immédiatement ce que donnera son devis.

15. LIVE PREVIEW

Créer un aperçu du devis en temps réel.

Quand l'utilisateur modifie :

quantité ;

prix ;

désignation ;

l'aperçu se met immédiatement à jour.

Le total doit également s'actualiser avec une micro-animation.

Cela donne une sensation de produit vivant.

16. AJOUT DE LIGNE

L'ajout d'une ligne doit être extrêmement fluide.

Bouton :

- Ajouter une prestation

Une nouvelle ligne apparaît avec une animation courte.

Focus automatique sur le champ de désignation.

Le clavier doit permettre de naviguer rapidement entre :

désignation ;

quantité ;

prix.

Sur desktop, optimiser la saisie au clavier.

17. TOTAL

Le total doit être visuellement dominant.

Exemple :

Sous-total

105 000 FCFA

────────────────

TOTAL

105 000 FCFA

Lorsque le montant change :

animation numérique subtile ;

aucun effet excessif ;

aucune animation qui ralentit la saisie.

18. ACTIONS DU DEVIS

En bas ou dans un header sticky :

Enregistrer

Partager

Télécharger PDF

Les actions principales doivent rester accessibles même lorsque l'utilisateur fait défiler une longue liste de prestations.

19. PARTAGE — MOMENT "WOW"

Après avoir cliqué sur :

Partager

ne pas simplement afficher un toast.

Créer un petit panneau/modal glass élégant.

Afficher :

Votre devis est prêt à être partagé.

[ https://app.../quote/xxxxx ]

        Copier le lien

        Partager sur WhatsApp

Après copie :

le bouton devient temporairement :

✓ Copié

avec une micro-animation.

20. PAGE PUBLIQUE CLIENT

La page publique est extrêmement importante.

Le client doit avoir l'impression de consulter un document premium, pas une page technique.

Créer une présentation élégante :

                DEVIS

          DEV-2026-0012

          Préparé pour

             Jean Dupont

────────────────────────────────

Installation électrique

4 × 15 000 FCFA 60 000

Câblage

10 × 2 000 FCFA 20 000

────────────────────────────────

TOTAL

105 000 FCFA

Utiliser le glassmorphisme avec beaucoup plus de sobriété.

21. MOBILE FIRST POUR LE CLIENT

Le lien envoyé sur WhatsApp sera très probablement ouvert sur smartphone.

La page publique doit donc être parfaite sur mobile.

Priorités :

lisibilité ;

vitesse ;

gros boutons ;

informations essentielles ;

aucun élément inutile.

Le client doit comprendre le devis en quelques secondes.

22. ANIMATIONS

Les animations sont obligatoires mais doivent rester premium.

Utiliser des animations pour :

apparition des cards ;

changement de statut ;

ouverture des modals ;

ajout de ligne ;

mise à jour du total ;

changement de page ;

hover ;

dropdown ;

notifications.

Durée recommandée :

150–350 ms

Les animations doivent utiliser des easing naturels.

Éviter :

animations lentes ;

bounce excessif ;

rotations inutiles ;

effets flashy ;

transitions permanentes.

23. MICRO-INTERACTIONS

Ajouter de petites interactions partout où elles améliorent l'expérience.

Exemples :

Boutons

Hover → légère élévation.

Click → légère compression.

Cards

Hover → déplacement vertical de 1 à 2 px + changement subtil de lumière.

Statuts

Transition douce lorsqu'ils changent.

Copie

Icône clipboard → check.

Paiement

Passage de :

En attente

à :

Payée

avec animation de transition.

24. LOADING STATES

Ne jamais afficher une page vide pendant un chargement.

Utiliser :

skeletons ;

shimmer très subtil ;

transitions.

Exemple dashboard :

Les KPI apparaissent sous forme de skeleton glass avant les vraies données.

25. EMPTY STATES

Les états vides doivent être conçus.

Pas simplement :

Aucun résultat.

Exemple :

              ✦

       Votre activité commence ici.

       Créez votre premier devis
       et envoyez-le à votre client.

          + Nouveau devis

L'état vide doit encourager l'action.

26. SUCCESS STATES

Les actions importantes doivent avoir une vraie sensation de réussite.

Après création d'un devis :

petite animation de confirmation.

Après conversion :

✓
Facture créée

Votre devis DEV-2026-0012
est maintenant la facture
FAC-2026-0007.

Puis proposer :

Voir la facture

27. MODALS

Les modals doivent être glassmorphism :

backdrop blur ;

surface translucide ;

bordure subtile ;

shadow ;

radius généreux.

Le contenu doit rester très lisible.

Ne pas utiliser de modals géants pour de petites confirmations.

28. SIDEBAR

Desktop :

Sidebar élégante, compacte.

Sections :

WORKSPACE

Dashboard
Devis
Factures
Clients

────────────

PARAMÈTRES

Profil
Paramètres

Le menu actif possède une surface glass/accent très subtile.

La sidebar peut avoir un effet de profondeur légèrement différent du contenu principal.

29. MOBILE NAVIGATION

Sur mobile :

ne pas conserver une sidebar desktop compressée.

Utiliser une navigation adaptée :

bottom navigation ;

menu mobile ;

action principale flottante.

Le bouton :

- Nouveau devis

doit rester très accessible.

30. DARK MODE

Prévoir une architecture compatible dark mode.

Si le temps de développement le permet, implémenter :

Light

Glass blanc/translucide.

Dark

Glass noir/translucide avec halos lumineux subtils.

Le dark mode doit conserver un contraste excellent.

Ne pas utiliser du blanc pur partout.

31. PROFONDEUR VISUELLE

Créer une hiérarchie en profondeur :

BACKGROUND
↓
GLASS SURFACE
↓
CARD
↓
CONTENT
↓
FLOATING ACTION
↓
MODAL

Chaque niveau doit avoir une différence subtile de :

luminosité ;

blur ;

shadow ;

transparence ;

bordure.

Le résultat doit donner une impression de profondeur sans devenir chargé.

32. BACKGROUND DYNAMIQUE

Le background peut comporter des éléments abstraits très subtils :

gradients radiaux ;

halos ;

blobs ;

lumière diffuse.

Ils doivent être très lents et presque imperceptibles.

Objectif :

donner de la vie à l'interface.

Pas :

attirer l'attention sur le background.

33. DESIGN DES CHIFFRES

Les montants financiers doivent être particulièrement bien travaillés.

Utiliser :

chiffres tabulaires si disponibles ;

poids typographique fort ;

espacement précis ;

alignement parfait.

Les montants doivent être faciles à scanner.

34. STATUTS VISUELS

Créer un système cohérent.

Exemple :

● Brouillon
● Envoyé
● Accepté
● Converti
● Payée
● En attente

Les badges doivent être :

petits ;

élégants ;

arrondis ;

légèrement translucides ;

accompagnés éventuellement d'un point coloré.

Éviter les gros badges criards.

35. ACCESSIBILITÉ

Le design premium ne doit jamais sacrifier l'accessibilité.

Respecter :

contraste suffisant ;

tailles de texte lisibles ;

focus states ;

navigation clavier ;

labels accessibles ;

boutons clairement identifiables.

Les effets glass ne doivent jamais rendre le texte illisible.

36. DESIGN SYSTEM

Créer un petit design system cohérent avant de construire toutes les pages.

Définir :

couleurs ;

typographie ;

spacing ;

radius ;

shadows ;

glass surfaces ;

boutons ;

inputs ;

badges ;

cards ;

modals ;

transitions.

Toutes les interfaces doivent utiliser ce système.

Ne pas créer chaque écran avec son propre style.

37. RÈGLE "NO GENERIC UI"

Interdiction de produire :

dashboard générique ;

cartes Bootstrap-like ;

tableaux administratifs basiques ;

boutons standards sans personnalité ;

formulaires plats ;

interfaces visuellement statiques.

Chaque écran doit avoir une intention esthétique claire.

Le produit doit être immédiatement reconnaissable.

38. RÈGLE "MOTION WITH PURPOSE"

Chaque animation doit avoir une raison.

Elle doit :

informer ;

confirmer ;

guider ;

créer de la continuité ;

renforcer la hiérarchie.

Si une animation n'améliore aucune de ces choses, ne pas l'ajouter.

39. SENSATION RECHERCHÉE

À la fin, l'utilisateur doit ressentir :

Première ouverture

"C'est propre."

Premier devis

"C'est simple."

Ajout des lignes

"C'est fluide."

Génération PDF

"C'est professionnel."

Partage

"C'est pratique."

Conversion

"Je n'ai rien eu à recopier."

Dashboard

"Je vois exactement où j'en suis."

Après quelques jours

"Je ne veux plus revenir à Word + WhatsApp."

40. TEST DE QUALITÉ DESIGN

Avant livraison, ouvrir chaque écran et se poser les questions suivantes :

Est-ce immédiatement compréhensible ?

Quelle est l'action principale ?

Y a-t-il trop d'informations ?

Les espaces sont-ils suffisants ?

Les animations sont-elles naturelles ?

Le glassmorphisme améliore-t-il réellement l'interface ?

Les cartes semblent-elles appartenir au même produit ?

Le mobile est-il aussi qualitatif que le desktop ?

Les montants sont-ils immédiatement lisibles ?

Les erreurs sont-elles compréhensibles ?

Les états de chargement sont-ils élégants ?

Les états vides donnent-ils envie d'agir ?

Le produit ressemble-t-il à un SaaS premium en 2026 ?

Si la réponse est non à plusieurs de ces questions, retravailler l'interface avant de considérer le produit terminé.

41. PRIORITÉ ABSOLUE

Le développement ne doit pas suivre :

"D'abord faire fonctionner, puis mettre un peu de design."

Le produit doit être construit dès le départ avec :

fonctionnalité + UX + design + motion

comme un seul système.

L'objectif final n'est pas simplement :

"une application qui fonctionne."

L'objectif est :

"une application que les utilisateurs prennent plaisir à utiliser."

## Development

Prerequisites: Node.js (v18+) and npm.

```sh
npm install
npm run dev
```

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
