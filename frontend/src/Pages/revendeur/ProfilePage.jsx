import BusinessProfilePage from '../../components/BusinessProfilePage';
import partnershipService from '../../services/partnershipService';

function RevendeurProfilePage() {
  return (
    <BusinessProfilePage
      accent="blue"
      roleLabel="Revendeur"
      showPostalCode
      directoryLoader={partnershipService.getFournisseurDirectory}
    />
  );
}

export default RevendeurProfilePage;
