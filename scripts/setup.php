<?php
chdir('/var/www/html');
require 'bootstrap.php';
$app = new \Espo\Core\Application();
$container = $app->getContainer();
$app->setupSystemUser();
$config = $container->getByClass(\Espo\Core\Utils\Config::class);
$writer = $container->getByClass(\Espo\Core\InjectableFactory::class)
    ->create(\Espo\Core\Utils\Config\ConfigWriter::class);
$tabs = array_values(array_filter($config->get('tabList') ?? [], fn ($tab) => $tab !== 'Apartment'));
array_splice($tabs, min(1, count($tabs)), 0, ['Apartment']);
$writer->set('tabList', $tabs);
$writer->set('language', 'ru_RU');
$writer->save();
echo "Apartment tab configured.\n";
if (!in_array('--demo', $argv, true)) { exit(0); }
$em = $container->get('entityManager');
// A stable name makes repeated demo imports idempotent, including partial runs.
for ($floor = 1; $floor <= 8; $floor++) {
    for ($slot = 1; $slot <= 6; $slot++) {
        $number = ($floor - 1) * 6 + $slot;
        $name = 'Учебный дом / квартира ' . $number;
        if ($em->getRDBRepository('Apartment')->where(['name' => $name])->findOne()) continue;
        $entity = $em->getNewEntity('Apartment');
        $area = 28 + $slot * 8.5;
        $entity->set([
            'name' => $name, 'building' => 'Учебный дом', 'entrance' => '1',
            'floor' => $floor, 'number' => (string) $number, 'rooms' => 1 + ($slot % 3),
            'area' => $area, 'price' => $area * 150000,
            'status' => $number % 7 === 0 ? 'Sold' : ($number % 5 === 0 ? 'Reserved' : 'Available'),
            'description' => 'Учебный пример. Не реальное предложение продажи.',
        ]);
        $em->saveEntity($entity);
    }
}
echo "Demo apartments ready.\n";
