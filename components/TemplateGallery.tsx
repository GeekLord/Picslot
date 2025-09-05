/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import type { Template } from '../types';

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
}

const templates: Template[] = [
    {
        title: 'Vintage Film Look',
        description: 'Give your photos a classic, grainy film aesthetic with faded colors.',
        imageUrl: 'https://storage.googleapis.com/project-screenshots/template-vintage.jpg',
        prompt: 'Apply a vintage film look with high grain, desaturated colors, and a slight sepia tone. Emulate a 1970s Kodachrome photo.'
    },
    {
        title: 'Synthwave Dreams',
        description: 'Transform your image with vibrant, neon 80s synthwave colors.',
        imageUrl: 'https://storage.googleapis.com/project-screenshots/template-synthwave.jpg',
        prompt: 'Convert this image into a vibrant 80s synthwave aesthetic. Add neon magenta and cyan glows, a grid-patterned ground, and subtle scan lines.'
    },
    {
        title: 'Dramatic B&W',
        description: 'Create a powerful black and white photo with deep blacks and high contrast.',
        imageUrl: 'https://storage.googleapis.com/project-screenshots/template-bw.jpg',
        prompt: 'Convert to a high-contrast, dramatic black and white image. Deepen the shadows and enhance the highlights to create a moody, Ansel Adams-inspired look.'
    },
    {
        title: 'Anime Scenery',
        description: 'Turn your landscape into a beautiful, vibrant anime-style background.',
        imageUrl: 'https://storage.googleapis.com/project-screenshots/template-anime.jpg',
        prompt: 'Transform this photo into the style of a beautiful, vibrant Japanese anime background scene. Use bold, clean outlines, cel-shading, and highly saturated, dream-like colors. Add subtle light rays.'
    }
];


const TemplateCard: React.FC<{ template: Template; onSelect: () => void; }> = ({ template, onSelect }) => {
    return (
        <div 
            onClick={onSelect}
            className="group relative aspect-video w-full bg-gray-800 border border-gray-700/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
        >
            <img src={template.imageUrl} alt={template.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
                <h3 className="font-bold text-white text-lg">{template.title}</h3>
                <p className="text-sm text-gray-300">{template.description}</p>
            </div>
            <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-white font-bold text-lg">Use Template</span>
            </div>
        </div>
    );
};

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate }) => {
  return (
    <div>
        <h2 className="text-2xl font-bold text-white mb-4">Start from a Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
                <TemplateCard 
                    key={template.title}
                    template={template}
                    onSelect={() => onSelectTemplate(template)}
                />
            ))}
        </div>
    </div>
  );
};

export default TemplateGallery;
