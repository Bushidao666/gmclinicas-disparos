import { Link } from "@heroui/link";
import { Button } from "@heroui/button";

import { title, subtitle } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>GM&nbsp;</span>
        <span className={title({ color: "green" })}>Disparos&nbsp;</span>
        <div className={subtitle({ class: "mt-4" })}>
          Sistema completo de disparos WhatsApp para agências
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          as={Link}
          color="primary"
          href="/clients"
          radius="full"
          variant="shadow"
        >
          Acessar Dashboard
        </Button>
        <Button as={Link} href="/campaigns" radius="full" variant="bordered">
          Criar Campanha
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
        <div className="bg-default-100 p-6 rounded-lg text-center">
          <h3 className="font-semibold mb-2">Gerenciamento de Clientes</h3>
          <p className="text-sm text-default-600">
            Cadastre e organize todos os seus clientes em um só lugar
          </p>
        </div>
        <div className="bg-default-100 p-6 rounded-lg text-center">
          <h3 className="font-semibold mb-2">Campanhas Automatizadas</h3>
          <p className="text-sm text-default-600">
            Crie campanhas de disparo com agendamento e controle de volume
          </p>
        </div>
        <div className="bg-default-100 p-6 rounded-lg text-center">
          <h3 className="font-semibold mb-2">Respostas e Agendamentos</h3>
          <p className="text-sm text-default-600">
            Acompanhe respostas e gerencie agendamentos automaticamente
          </p>
        </div>
      </div>
    </section>
  );
}
