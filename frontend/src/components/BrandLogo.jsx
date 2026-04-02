import brandLogo from '../assets/logo.png';

function BrandLogo({
  imageClassName = 'h-12 w-auto',
  alt = 'TuniMoto logo',
  className = '',
  width = 480,
  height = 229,
  loading = 'lazy',
  fetchPriority = 'auto',
}) {
  return (
    <img
      src={brandLogo}
      alt={alt}
      width={width}
      height={height}
      className={`${imageClassName} ${className}`.trim()}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
    />
  );
}

export default BrandLogo;
