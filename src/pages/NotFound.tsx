import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="max-w-sm rounded-3xl border bg-card p-8 text-center shadow-card">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Esta página não foi encontrada.</p>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-medium text-primary-foreground">
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
