import React from 'react';
import { BusinessSpec } from '../../types';
import { BusinessSpecEditor } from './BusinessSpecEditor';

interface BusinessSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (spec: Omit<BusinessSpec, 'id' | 'lastUpdated'>) => Promise<void>;
  spec?: BusinessSpec;
}

export const BusinessSpecModal: React.FC<BusinessSpecModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  spec,
}) => {
  const handleSubmit = async (specData: Partial<BusinessSpec>) => {
    await onSubmit(specData as Omit<BusinessSpec, 'id' | 'lastUpdated'>);
  };

  return (
    <BusinessSpecEditor
      spec={spec}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
};