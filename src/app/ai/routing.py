# Routing logic: maps extracted data to a domain slug.
# Called after AI capture to determine where to store an entity.

DOMAIN_KEYWORDS = {
    "identity": ["passeport", "cni", "carte nationale", "permis", "diplôme", "carte vitale", "acte"],
    "housing": ["bail", "loyer", "quittance", "assurance habitation", "électricité", "gaz", "internet", "fibre"],
    "finance": ["compte", "banque", "facture", "crédit", "épargne", "impôt", "taxe", "virement"],
    "work": ["contrat", "fiche de paie", "employeur", "salaire", "rupture", "avenant"],
    "health": ["médecin", "ordonnance", "médicament", "vaccin", "analyse", "mutuelle", "sécu"],
    "learning": ["certificat", "certification", "cours", "formation", "diplôme", "badge"],
    "vehicle": ["carte grise", "assurance auto", "contrôle technique", "entretien", "garage"],
    "travel": ["billet", "réservation", "visa", "hôtel", "vol", "assurance voyage"],
    "subscriptions": ["abonnement", "licence", "subscription", "netflix", "spotify", "adobe"],
    "contacts": ["contact", "personne", "ami", "famille", "médecin traitant"],
    "projects": ["projet", "idée", "side project", "goal", "objectif"],
}


def route_to_domain(text: str) -> str:
    text_lower = text.lower()
    scores = {slug: 0 for slug in DOMAIN_KEYWORDS}
    for slug, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                scores[slug] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "projects"
