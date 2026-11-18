import React from 'react';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/**
 * Registrazione dell'intero set solid, una sola volta a livello di modulo.
 * Tutte le icone si passano per nome, quindi nessun file deve importare
 * le singole definizioni.
 */
library.add(fas);


/**
 * Icona del framework: unico punto in cui si usa FontAwesome.
 *
 * Il nome è quello canonico di FontAwesome 7 ('pen-to-square', 'xmark', 'house'...):
 * gli alias della versione 5 ('edit', 'times', 'home') non esistono più.
 *
 * @example
 * <Icon name="trash" />
 * <Icon name="spinner" spin className='me-2' />
 * <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} />
 *
 * Ogni altra prop viene inoltrata a FontAwesomeIcon: className, size, color,
 * style, spin, onClick, role e le altre documentate da FontAwesome.
 */
export default function Icon({ name, icon, ...props }) {

    /** 'icon' è accettato per compatibilità con le pagine custom scritte prima */
    const iconName = name || icon;

    if (!iconName) {
        return null;
    }

    return <FontAwesomeIcon icon={iconName} {...props} />;
};
