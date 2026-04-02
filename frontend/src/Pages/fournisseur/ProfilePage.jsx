import BusinessProfilePage from '../../components/BusinessProfilePage';
import partnershipService from '../../services/partnershipService';

function FournisseurProfilePage() {
  return (
    <BusinessProfilePage
      accent="purple"
      roleLabel="Fournisseur"
      showPostalCode={false}
      directoryLoader={partnershipService.getRevendeurDirectory}
    />
  );
}

export default FournisseurProfilePage;
