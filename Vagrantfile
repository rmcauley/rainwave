# -*- mode: ruby -*-
# vi: set ft=ruby :

VAGRANTFILE_API_VERSION = "2"

unless ENV["RW_DEV_MUSIC_DIR"]
    raise "Please set the RW_DEV_MUSIC_DIR environment variable to the folder where your music is stored."
end

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
    config.vm.box = "ubuntu/trusty64"
    config.vm.box_check_update = true
    config.vm.network :forwarded_port, guest: 20000, host: 20000, auto_correct: true
    config.vm.synced_folder ENV["RW_DEV_MUSIC_DIR"], "/music"
    config.vm.provision "shell", path: "etc/vagrant_provision.sh"
end
