import { Link } from "react-router-dom";

function PropertyCard({ propiedad }) {
  return (
    <div className="card">
      <img
        src={
          propiedad.fotos?.[0]?.Url ||
          "https://picsum.photos/400/300?random=10"
        }
        alt={propiedad.Titulo}
      />

      <div className="card-body">
        <div className="card-title">{propiedad.Titulo}</div>

        <div className="card-price">
          ₡ {Number(propiedad.Precio).toLocaleString("es-CR")}
        </div>

        <Link to={`/propiedad/${propiedad.PropiedadId}`} className="btn">
          Ver detalles
        </Link>
      </div>
    </div>
  );
}

export default PropertyCard;
