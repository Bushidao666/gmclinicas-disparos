"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthCodeErrorPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-danger-50 to-danger-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-danger-100 dark:bg-danger-900/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-danger-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-danger-600">Link Inválido</h1>
              <p className="text-sm text-default-500 mt-2">
                O link de confirmação expirou ou é inválido
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardBody className="text-center space-y-4">
          <p className="text-default-600">
            Isso pode acontecer se:
          </p>
          <ul className="text-sm text-default-500 space-y-1 text-left">
            <li>• O link expirou (válido por 1 hora)</li>
            <li>• O link já foi usado</li>
            <li>• Houve um erro na URL</li>
          </ul>
          
          <div className="pt-4">
            <Button 
              color="primary" 
              onPress={() => router.replace("/login")}
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </div>
          
          <p className="text-xs text-default-400">
            Se você é um novo usuário, solicite um novo convite ao administrador.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
