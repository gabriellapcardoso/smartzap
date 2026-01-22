'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useOnboardingProgress, OnboardingStep } from './hooks/useOnboardingProgress';

// Steps
import { WelcomeStep } from './steps/WelcomeStep';
import { RequirementsStep } from './steps/RequirementsStep';
import { CreateAppStep } from './steps/CreateAppStep';
import { AddWhatsAppStep } from './steps/AddWhatsAppStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { TestConnectionStep } from './steps/TestConnectionStep';
import { ConfigureWebhookStep } from './steps/ConfigureWebhookStep';
import { SyncTemplatesStep } from './steps/SyncTemplatesStep';
import { SendFirstMessageStep } from './steps/SendFirstMessageStep';
import { CreatePermanentTokenStep } from './steps/CreatePermanentTokenStep';
import { DirectCredentialsStep } from './steps/DirectCredentialsStep';
import { OnboardingCompleteStep } from './steps/OnboardingCompleteStep';

interface OnboardingModalProps {
  isConnected: boolean;
  onComplete: (credentials: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
  }) => Promise<void>;
  /** Força exibição do modal em um step específico (ex: 'configure-webhook') */
  forceStep?: OnboardingStep;
}

export function OnboardingModal({ isConnected, onComplete, forceStep }: OnboardingModalProps) {
  const {
    progress,
    isLoaded,
    shouldShowOnboardingModal,
    currentStepNumber,
    totalSteps,
    startOnboarding,
    nextStep,
    previousStep,
    completeOnboarding,
    completeStep,
    goToStep,
  } = useOnboardingProgress();

  // Se forceStep foi passado e é diferente do current, navega para ele
  // Mas NÃO reseta se o usuário foi intencionalmente para 'complete' (fechar modal)
  // CRÍTICO: Esperar localStorage carregar antes de forçar step (evita sobrescrever estado salvo)
  React.useEffect(() => {
    if (!isLoaded) return;

    if (forceStep && progress.currentStep !== forceStep && progress.currentStep !== 'complete') {
      goToStep(forceStep);
    }
  }, [isLoaded, forceStep, progress.currentStep, goToStep]);

  // O step atual é o forceStep (se fornecido) ou o do localStorage
  const currentStep = forceStep || progress.currentStep;

  // Steps que podem aparecer mesmo após conectado (fluxo pós-credenciais)
  const postConnectionSteps: OnboardingStep[] = [
    'configure-webhook',
    'sync-templates',
    'send-first-message',
    'create-permanent-token',
    'complete',
  ];
  const isPostConnectionStep = postConnectionSteps.includes(currentStep);

  // Onboarding foi finalizado (usuário clicou em "Começar a usar")
  const isFullyComplete = progress.completedAt !== null;

  // Mostrar modal se:
  // 1. Fluxo inicial: não completou E não está conectado
  // 2. Steps pós-conexão: mesmo após "completar" o wizard, permitir reabrir esses steps
  //    (ex: usuário clicou "Configurar webhook" no checklist)
  // IMPORTANTE: usa progress.currentStep para verificar se deve fechar (não currentStep que pode vir do forceStep)
  const shouldShow = isLoaded && (
    (!isFullyComplete && shouldShowOnboardingModal && !isConnected) || // Fluxo inicial
    (isPostConnectionStep && progress.currentStep !== 'complete') // Pós-conexão (fecha quando progress.currentStep === 'complete')
  );

  // Estado temporário para credenciais durante o wizard
  const [credentials, setCredentials] = React.useState({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
  });

  const handleComplete = async () => {
    await onComplete(credentials);
    completeOnboarding();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            onSelectPath={(path) => startOnboarding(path)}
          />
        );

      case 'requirements':
        return (
          <RequirementsStep
            onNext={nextStep}
            onBack={previousStep}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'create-app':
        return (
          <CreateAppStep
            onNext={nextStep}
            onBack={previousStep}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'add-whatsapp':
        return (
          <AddWhatsAppStep
            onNext={nextStep}
            onBack={previousStep}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'credentials':
        return (
          <CredentialsStep
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onNext={nextStep}
            onBack={previousStep}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'test-connection':
        return (
          <TestConnectionStep
            credentials={credentials}
            onComplete={async () => {
              // Salva as credenciais e avança para o próximo step (webhook)
              await onComplete(credentials);
              nextStep();
            }}
            onBack={previousStep}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'configure-webhook':
        return (
          <ConfigureWebhookStep
            onNext={() => {
              // Sempre fecha o modal após configurar webhook
              // Os próximos steps são opcionais e podem ser feitos pelo checklist
              completeStep('configure-webhook');
              goToStep('complete');
            }}
            onBack={() => goToStep('complete')}
            stepNumber={6}
            totalSteps={totalSteps}
          />
        );

      case 'sync-templates':
        return (
          <SyncTemplatesStep
            onNext={nextStep}
            onBack={previousStep}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'send-first-message':
        return (
          <SendFirstMessageStep
            onNext={nextStep}
            onBack={previousStep}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'create-permanent-token':
        return (
          <CreatePermanentTokenStep
            currentToken={credentials.accessToken}
            onTokenUpdate={async (newToken) => {
              // Atualiza o token nas credenciais locais
              setCredentials(prev => ({ ...prev, accessToken: newToken }));
              // Salva no backend (health check será atualizado automaticamente)
              await onComplete({ ...credentials, accessToken: newToken });
            }}
            onNext={completeOnboarding}
            onBack={previousStep}
            onSkip={completeOnboarding}
            stepNumber={currentStepNumber}
            totalSteps={totalSteps}
          />
        );

      case 'direct-credentials':
        return (
          <DirectCredentialsStep
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onComplete={handleComplete}
            onBack={previousStep}
          />
        );

      case 'complete':
        return (
          <OnboardingCompleteStep
            onComplete={completeOnboarding}
          />
        );

      default:
        return null;
    }
  };

  if (!shouldShow) return null;

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        overlayClassName="bg-black/80 backdrop-blur-sm"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {currentStep === 'welcome' ? (
          <>
            <DialogHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">🚀</span>
                </div>
              </div>
              <DialogTitle className="text-2xl">Bem-vindo ao SmartZap!</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Para enviar mensagens pelo WhatsApp, você precisa conectar uma conta do WhatsApp Business API.
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <DialogHeader className="sr-only">
            <DialogTitle>Configuração do WhatsApp</DialogTitle>
            <DialogDescription>Configure sua conta do WhatsApp Business API</DialogDescription>
          </DialogHeader>
        )}

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
