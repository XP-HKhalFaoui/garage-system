namespace GarageSystem.Domain.Enums;

public enum ClientType { Particulier, Société }
public enum Carburant { Essence, Diesel, GPL, Hybride, Électrique }
public enum Transmission { Manuelle, Automatique, SemiAutomatique }
public enum ORStatut { EnAttente, EnCours, Suspendu, TerminéTechnicien, Livré, Annulé }
public enum ORPriorité { Normal, Urgent }
public enum TypeIntervention { Vidange, Révision, Diagnostic, Freinage, Distribution, Climatisation, Électrique, Carrosserie, Autre }
public enum LigneORType { Pièce, MO }
public enum ArticleCategorie { Filtres, Huiles, Freinage, Transmission, Suspension, Moteur, Électrique, Carrosserie, Accessoires, Autre }
public enum ArticleUnité { Pièce, Litre, Kg, Mètre }
public enum MouvementStockType { EntréeBR, SortieOR, AjustementManuel, Inventaire, AnnulationOR }
public enum FactureStatut { Emise, PartiellementPayee, Soldee, Annulee }
public enum DevisStatut { Brouillon, Validé, EnvoyéClient, Accepté, Refusé, Expiré }
public enum ModePaiement { Espèces, Virement, Chèque, CB }
public enum NiveauUrgence { Immédiat, Bientôt, Préventif }
public enum TypePoste { Technicien, Caissier, RH, Admin, Receptionniste }
public enum TypeContrat { CDI, CDD, Temporaire }
public enum TypeJour { Travaillé, Congé, Maladie, Maternité, Férié, Weekend }
public enum TypeConge { Annuel, Maladie, Maternité, Événementiel, SansRetenue }
public enum CongeStatut { EnAttente, Approuvé, Refusé }
public enum AlerteStatut { Active, Résolue }
public enum TypeTarif { TarifNormal, PrixRéduit, Forfait }
public enum FactureGroupéeStatut { Émise, Soldée, Annulée }
public enum Wilaya
{
    Adrar = 1, Chlef, Laghouat, OumElBouaghi, Batna, Béjaïa, Biskra, Béchar,
    Blida, Bouira, Tamanrasset, Tébessa, Tlemcen, Tiaret, TiziOuzou, Alger,
    Djelfa, Jijel, Sétif, Saïda, Skikda, SidiBelAbbès, Annaba, Guelma,
    Constantine, Médéa, Mostaganem, MSila, Mascara, Ouargla, Oran, ElBayadh,
    Illizi, BordjBouArréridj, Boumerdès, ElTarf, Tindouf, Tissemsilt, ElOued,
    Khenchela, SoukAhras, Tipaza, Mila, AïnDefla, Naâma, AïnTémouchent,
    Ghardaïa, Relizane, TimimounW, BordjelBadji, OuledDjellal, BeniAbbès,
    InSalah, InGuezzam, TouggourT, Djanet, ElMGhair, ElMeniaa
}
