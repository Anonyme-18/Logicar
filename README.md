# Logicar

Application web de gestion de devis, factures et suivi financier pour les artisans indépendants.

Logicar permet de créer un devis professionnel, de le générer en PDF, puis de le convertir en facture sans ressaisie. Le tableau de bord donne une vision claire des montants facturés, encaissés et en attente.

## Fonctionnalités

- inscription et connexion sécurisées par email et mot de passe ;
- création de devis avec plusieurs prestations ;
- calcul des montants côté serveur ;
- génération de PDF ;
- statuts de devis : brouillon, envoyé, accepté, refusé ;
- conversion atomique d’un devis accepté en facture ;
- verrouillage du contenu des factures ;
- suivi des paiements ;
- tableau de bord financier avec filtres par période ;
- interface responsive desktop et mobile ;
- isolation stricte des données entre utilisateurs.

## Stack technique

- Next.js 16 avec App Router et Server Actions ;
- TypeScript ;
- Tailwind CSS v4 et Radix UI ;
- Neon PostgreSQL ;
- Better Auth pour l’authentification et les sessions ;
- `pg` pour les accès PostgreSQL côté serveur ;
- Zod pour la validation des entrées ;
- pdf-lib pour la génération des documents ;
- GitHub Actions pour l’intégration continue ;
- Vercel pour le déploiement.

## Architecture

```text
src/
├── app/                 # Routes Next.js et pages de l’application
├── components/          # Composants d’interface réutilisables
├── lib/
│   ├── auth.ts          # Configuration Better Auth
│   ├── db.ts            # Pool PostgreSQL Neon
│   ├── *.actions.ts     # Server Actions métier
│   ├── *.server.ts      # Logique serveur et calculs
│   └── pdf.server.ts    # Génération des PDF
└── styles.css           # Tokens et styles globaux

db/
└── migrations/          # Schéma PostgreSQL et contraintes métier
```

Les données métier sont toujours interrogées côté serveur. Les actions vérifient la session courante et filtrent chaque ressource par l’utilisateur authentifié.

## Prérequis

- Node.js 20.9 ou supérieur ;
- npm ;
- un projet PostgreSQL Neon.

## Installation locale

```bash
git clone https://github.com/Anonyme-18/Logicar.git
cd Logicar
npm install
```

Copier le fichier d’exemple :

```bash
cp .env.example .env
```

Puis renseigner les variables suivantes :

```env
DATABASE_URL="postgresql://user:password@your-neon-host/neondb?sslmode=require"
BETTER_AUTH_SECRET="une-valeur-secrete-longue-et-aleatoire"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Générer le schéma initial dans Neon depuis l’éditeur SQL ou avec `psql` :

```bash
psql "$DATABASE_URL" -f db/migrations/0000_neon_initial.sql
```

Lancer l’application :

```bash
npm run dev
```

L’application est ensuite disponible sur [http://localhost:3000](http://localhost:3000).

## Scripts disponibles

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm run start      # serveur de production local
npm run lint       # analyse ESLint
npm run typecheck  # vérification TypeScript
npm run format     # formatage Prettier
npm audit          # audit des dépendances
```

La CI GitHub exécute automatiquement le lint, le typage, le build et l’audit des dépendances à chaque push et pull request.

## Déploiement sur Vercel

1. Importer le dépôt GitHub dans Vercel.
2. Sélectionner le framework **Next.js**.
3. Ajouter les variables d’environnement de production :

```env
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://votre-domaine.vercel.app
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
```

4. Appliquer la migration SQL sur Neon avant le premier usage.
5. Déployer et vérifier le parcours inscription → devis → facture.

Ne jamais publier `.env`, `DATABASE_URL` ou `BETTER_AUTH_SECRET`. Le fichier `.env.example` contient uniquement des exemples non sensibles.

## Sécurité

- authentification et sessions gérées côté serveur ;
- secrets absents du bundle client ;
- validation Zod des données entrantes ;
- requêtes PostgreSQL paramétrées ;
- contrôle d’appartenance utilisateur sur les ressources ;
- contraintes SQL sur les montants et les relations ;
- factures verrouillées après conversion ;
- historique Git purgé des fichiers d’environnement.

Pour signaler une vulnérabilité, consulter [SECURITY.md](SECURITY.md) plutôt que d’ouvrir une issue publique.

## État du projet

Le projet est fonctionnel sur son périmètre MVP. La base de données de production doit être initialisée sur Neon avant le déploiement final.

## Licence

Projet personnel à vocation de démonstration professionnelle. La licence pourra être précisée avant une distribution publique.
