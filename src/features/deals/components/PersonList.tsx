import React from 'react';
import { Plus, Users } from 'lucide-react';
import { PersonForm } from './PersonForm';
import type { Person } from '@/types/types';
import { createDefaultPerson } from '@/types/types';
import { Button } from '@/components/Button';

interface PersonListProps {
  title: string;
  people: Person[];
  onChange: (people: Person[]) => void;
}

export const PersonList: React.FC<PersonListProps> = ({
  title,
  people,
  onChange,
}) => {
  const handlePersonChange = (index: number, updatedPerson: Person) => {
    const newPeople = [...people];
    const oldPerson = newPeople[index];
    newPeople[index] = updatedPerson;
    
    // Verifica se o estado civil mudou para casado ou união estável
    const oldMaritalState = oldPerson.maritalState;
    const newMaritalState = updatedPerson.maritalState;
    
    // Se mudou para casado ou união estável e não era antes
    if (
      updatedPerson.personType === 'PF' &&
      (newMaritalState === 'casado' || newMaritalState === 'uniao_estavel') &&
      oldMaritalState !== 'casado' &&
      oldMaritalState !== 'uniao_estavel'
    ) {
      // Verifica se já existe um cônjuge para esta pessoa
      const hasSpouse = newPeople.some((p, idx) => 
        idx !== index && p.isSpouse && !updatedPerson.isSpouse
      );
      
      // Se não existe cônjuge, adiciona automaticamente
      if (!hasSpouse && !updatedPerson.isSpouse) {
        const spouse = createDefaultPerson();
        spouse.isSpouse = true;
        spouse.maritalState = newMaritalState;
        spouse.propertyRegime = updatedPerson.propertyRegime || 'comunhao_parcial';
        newPeople.splice(index + 1, 0, spouse);
      }
    }
    
    // Se mudou de casado/união estável para outro estado e não é cônjuge
    if (
      updatedPerson.personType === 'PF' &&
      (oldMaritalState === 'casado' || oldMaritalState === 'uniao_estavel') &&
      newMaritalState !== 'casado' &&
      newMaritalState !== 'uniao_estavel' &&
      !updatedPerson.isSpouse
    ) {
      // Remove o cônjuge associado (próxima pessoa se for cônjuge)
      const spouseIndex = index + 1;
      if (spouseIndex < newPeople.length && newPeople[spouseIndex].isSpouse) {
        newPeople.splice(spouseIndex, 1);
      }
    }
    
    // Sincroniza o regime de bens entre pessoa e cônjuge
    if (
      updatedPerson.personType === 'PF' &&
      (newMaritalState === 'casado' || newMaritalState === 'uniao_estavel') &&
      updatedPerson.propertyRegime !== oldPerson.propertyRegime
    ) {
      // Encontra o cônjuge
      const spouseIndex = updatedPerson.isSpouse 
        ? newPeople.findIndex((p, idx) => idx !== index && !p.isSpouse && (p.maritalState === 'casado' || p.maritalState === 'uniao_estavel'))
        : newPeople.findIndex((p, idx) => idx !== index && p.isSpouse);
      
      // Atualiza o regime de bens do cônjuge se encontrado
      if (spouseIndex !== -1) {
        newPeople[spouseIndex] = {
          ...newPeople[spouseIndex],
          propertyRegime: updatedPerson.propertyRegime,
        };
      }
    }
    
    onChange(newPeople);
  };

  const handleAddPerson = () => {
    onChange([...people, createDefaultPerson()]);
  };

  const handleRemovePerson = (index: number) => {
    if (people.length > 1) {
      onChange(people.filter((_, i) => i !== index));
    }
  };

  // Check if there are multiple people to show spouse option
  const showSpouseOption = people.length > 1;

  // Verifica se todas as pessoas casadas/união estável já têm cônjuge
  const hasMarriedWithoutSpouse = people.some((person, idx) => {
    if (person.personType === 'PF' && 
        !person.isSpouse && 
        (person.maritalState === 'casado' || person.maritalState === 'uniao_estavel')) {
      // Verifica se existe um cônjuge logo após ou em qualquer lugar da lista
      const hasCorrespondingSpouse = people.some((p, pIdx) => 
        pIdx !== idx && p.isSpouse && p.personType === 'PF'
      );
      return !hasCorrespondingSpouse;
    }
    return false;
  });

  // Mostra o botão adicionar apenas se:
  // 1. Não existe nenhum cônjuge na lista, OU
  // 2. Existe alguém casado/união estável sem cônjuge
  const showAddButton = !people.some(p => p.isSpouse) || hasMarriedWithoutSpouse;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
          <div className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {people.length}
          </div>
        </div>
        {showAddButton && (
          <Button
            onClick={handleAddPerson}
            className="flex items-center gap-2 btn-md"
            variant='ghost'
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        )}
      </div>

      {/* People List */}
      <div className="space-y-3">
        {people.map((person, index) => (
          <PersonForm
            key={person.id}
            person={person}
            index={index}
            canRemove={people.length > 1}
            showSpouseOption={showSpouseOption}
            onChange={(updated) => handlePersonChange(index, updated)}
            onRemove={() => handleRemovePerson(index)}
          />
        ))}
      </div>

      {/* Empty State */}
      {people.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Nenhuma pessoa adicionada</p>
          <button
            type="button"
            onClick={handleAddPerson}
            className="mt-3 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Adicionar Pessoa
          </button>
        </div>
      )}
    </div>
  );
};

